from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from app.state import DebateState
from app.config import settings
from app.prompts import get_system_prompt
import json
import re
import ast
import logging
import datetime
from difflib import SequenceMatcher

# --- 1. SETUP LOGGING ---
timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
log_filename = f"debate_log_{timestamp}.json"

# Configure standard logger
logging.basicConfig(
    filename=f"system_{timestamp}.log", 
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

def log_event(event_type, details):
    """Appends structured logs to a JSON file."""
    entry = {
        "timestamp": datetime.datetime.now().isoformat(),
        "type": event_type,
        "details": details
    }
    with open(log_filename, "a") as f:
        f.write(json.dumps(entry) + "\n")

# --- 2. VALIDATION UTILS ---
def check_repetition(current_text, past_messages, agent_name):
    """Checks string similarity against agent's own past messages."""
    own_messages = [m.content for m in past_messages if m.type == "ai" and agent_name in str(m)]
    
    for past_msg in own_messages:
        # SequenceMatcher ratio > 0.8 means highly similar
        similarity = SequenceMatcher(None, current_text, past_msg).ratio()
        if similarity > 0.8:
            return True, past_msg
    return False, None

def check_coherence(text, topic):
    """Simple keyword check for topic drift (Lightweight)."""
    # In a real prod system, this would be another LLM call.
    # Here we check if keywords from topic exist in response.
    keywords = set(topic.lower().split())
    text_words = set(text.lower().split())
    # If overlap is very low (and text is long), flag it.
    if len(text) > 100 and len(keywords.intersection(text_words)) == 0:
        return False, "Potential topic drift detected"
    return True, "Coherent"

# --- LLM SETUP ---
llm = ChatGroq(
    temperature=0.6, # We will make this configurable later for determinism
    model_name=settings.MODEL_NAME,
    groq_api_key=settings.GROQ_API_KEY
)

def agent_node(state: DebateState, agent_name: str, persona: str):
    messages = state['messages']
    topic = state['topic']
    
    # Select Persona
    if agent_name == "Agent A":
        selected_persona = state.get("agent_a_persona", "Default")
    else:
        selected_persona = state.get("agent_b_persona", "Default")

    system_prompt_text = get_system_prompt(agent_name, selected_persona, topic)
    history_text = "\n".join([f"{m.type}: {m.content}" for m in messages])

    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt_text),
        ("human", f"Current Debate History:\n{history_text}\n\nYour turn to argue:")
    ])
    
    # Generate Response
    chain = prompt | llm
    response = chain.invoke({})
    content = response.content
    
    # --- 3. REPETITION & COHERENCE CHECKS ---
    is_repeated, similar_msg = check_repetition(content, messages, agent_name)
    if is_repeated:
        warning = f"REPETITION DETECTED. Agent {agent_name} repeated an argument."
        print(warning) # CLI Output
        log_event("Validation_Fail", {"agent": agent_name, "issue": "Repetition", "text": content})
        # Optional: Force regenerate or append warning to message (Simple fix: Append warning)
        response.content += f"\n[System Note: Argument similar to previous point.]"

    is_coherent, drift_msg = check_coherence(content, topic)
    if not is_coherent:
        log_event("Validation_Fail", {"agent": agent_name, "issue": drift_msg})

    # --- 4. LOGGING ---
    log_event("Turn_Execution", {
        "agent": agent_name,
        "round": state["round_count"],
        "content_length": len(content)
    })

    return {
        "messages": [response],
        "round_count": state["round_count"] + 1
    }

import re # Ensure regex is imported

# app/nodes.py
import re

# app/nodes.py
import re

def judge_node(state: DebateState):
    print("\n--- [DEBUG] JUDGE NODE V4 (MATH OVERRIDE) STARTED ---") 
    
    messages = state['messages']
    topic = state['topic']
    history_text = "\n".join([f"{m.type}: {m.content}" for m in messages])
    
    # 1. PROMPT (Unchanged)
    system_prompt = (
        "You are a critical Debate Judge. Analyze the debate.\n"
        "INSTRUCTIONS:\n"
        "1. Summary: Chronological recap of what happened.\n"
        "2. Rationale: Explain why the winner won.\n"
        "3. Weaknesses: List 2 weaknesses for each.\n\n"
        "OUTPUT FORMAT:\n"
        "Winner: [Agent A or Agent B]\n"
        "Summary: [Text]\n"
        "Rationale: [Text]\n"
        "Conclusion: [Text]\n"
        "A_Logic: [0-100]\n"
        "A_Persuasion: [0-100]\n"
        "A_Aggression: [0-100]\n"
        "B_Logic: [0-100]\n"
        "B_Persuasion: [0-100]\n"
        "B_Aggression: [0-100]\n"
        "A_Strengths: [List] || [List]\n"
        "A_Weaknesses: [List] || [List]\n"
        "B_Strengths: [List] || [List]\n"
        "B_Weaknesses: [List] || [List]"
    )

    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        ("human", f"Topic: {{topic}}\n\nHistory:\n{{history}}")
    ])
    
    chain = prompt | llm
    
    try:
        response = chain.invoke({"topic": topic, "history": history_text})
        content = response.content.strip() + "\n<END>"
        print(f"\n[DEBUG] RAW LLM OUTPUT:\n{content}\n") 
        
        # 2. PARSERS
        def get_block(tag, next_tag_hint):
            pattern = rf"{tag}:\s*(.*?)(?={next_tag_hint})"
            match = re.search(pattern, content, re.IGNORECASE | re.DOTALL)
            return match.group(1).strip() if match else ""

        def get_int(pattern, default):
            match = re.search(pattern, content, re.IGNORECASE)
            return int(match.group(1)) if match else default

        def get_list_from_block(tag, next_tag):
            raw = get_block(tag, next_tag)
            if "||" in raw: return [x.strip() for x in raw.split("||") if x.strip()]
            return [x.strip().lstrip("-•* ") for x in raw.split("\n") if x.strip()]

        # 3. SCRAPE TEXT
        summary = get_block("Summary", "Rationale")
        rationale = get_block("Rationale", "Conclusion")
        conclusion = get_block("Conclusion", "A_Logic")

        # 4. SCRAPE SCORES
        a_log = get_int(r"A_Logic:\s*(\d+)", 75)
        a_per = get_int(r"A_Persuasion:\s*(\d+)", 75)
        a_agg = get_int(r"A_Aggression:\s*(\d+)", 50)
        
        b_log = get_int(r"B_Logic:\s*(\d+)", 75)
        b_per = get_int(r"B_Persuasion:\s*(\d+)", 75)
        b_agg = get_int(r"B_Aggression:\s*(\d+)", 50)

        scores = {
            "Agent A": { "logic": a_log, "persuasion": a_per, "aggression": a_agg },
            "Agent B": { "logic": b_log, "persuasion": b_per, "aggression": b_agg }
        }
        
        # 5. DETERMINE WINNER MATHEMATICALLY (The Fix)
        # We average Logic + Persuasion (Aggression is usually a style stat, not score)
        score_a = (a_log + a_per) / 2
        score_b = (b_log + b_per) / 2
        
        if score_a > score_b:
            final_winner = "Agent A"
        elif score_b > score_a:
            final_winner = "Agent B"
        else:
            final_winner = "Draw"

        # 6. SCRAPE LISTS
        strengths = {
            "Agent A": get_list_from_block("A_Strengths", "A_Weaknesses"),
            "Agent B": get_list_from_block("B_Strengths", "B_Weaknesses")
        }
        weaknesses = {
            "Agent A": get_list_from_block("A_Weaknesses", "B_Strengths"),
            "Agent B": get_list_from_block("B_Weaknesses", "<END>")
        }

        formatted_data = {
            "winner": final_winner,
            "summary": summary,
            "rationale": rationale,
            "conclusion": conclusion,
            "scores": scores,
            "key_points": strengths, 
            "strengths": strengths,
            "weaknesses": weaknesses
        }
        
        print(f"[DEBUG] VALIDATED DATA: {formatted_data}")

    except Exception as e:
        print(f"[DEBUG] JUDGE CRASHED: {e}")
        formatted_data = {
            "winner": "Agent A", 
            "summary": "Error parsing.",
            "rationale": "Judge Error.",
            "scores": { "Agent A": {"logic": 0, "persuasion": 0, "aggression": 0}, "Agent B": {"logic": 0, "persuasion": 0, "aggression": 0} },
            "strengths": { "Agent A": [], "Agent B": [] },
            "weaknesses": { "Agent A": [], "Agent B": [] }
        }
        
    return { "winner": formatted_data }