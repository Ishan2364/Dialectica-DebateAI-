import os
import json
import asyncio
import datetime
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from app.graph import app as debate_graph

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- HELPER: Save Logs to File ---
def save_debate_log(topic: str, messages: list, winner: dict):
    """
    Saves the debate history and winner stats to the 'logs/' directory.
    """
    try:
        # 1. Ensure 'logs' folder exists
        log_dir = "logs"
        os.makedirs(log_dir, exist_ok=True)

        # 2. Create Filename with Timestamp
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"debate_log_{timestamp}.json"
        file_path = os.path.join(log_dir, filename)

        # 3. Construct Data Structure
        log_data = {
            "topic": topic,
            "timestamp": timestamp,
            "winner": winner,
            "messages": messages  # Expecting list of dicts: {sender, content}
        }

        # 4. Save to File
        with open(file_path, "w", encoding='utf-8') as f:
            json.dump(log_data, f, indent=2, ensure_ascii=False)
            
        print(f"✅ Log saved to: {file_path}")
        
    except Exception as e:
        print(f"❌ Failed to save log: {e}")

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/start_debate")
async def start_debate(
    topic: str, 
    agent_a: str = "Natural", 
    agent_b: str = "Natural", 
    rounds: int = 6
):
    async def event_generator():
        initial_state = {
            "topic": topic,
            "messages": [],
            "round_count": 0,
            "winner": None,
            "rationale": None,
            "agent_a_persona": agent_a,
            "agent_b_persona": agent_b,
            "max_rounds": rounds
        }

        # --- Track Data for Logging ---
        accumulated_messages = []
        final_winner_data = None

        for event in debate_graph.stream(initial_state):
            for node_name, state_update in event.items():
                
                # 1. Handle Agent Messages
                if "messages" in state_update and state_update["messages"]:
                    last_msg = state_update["messages"][-1]
                    sender = "Agent A" if node_name == "AgentA" else "Agent B"
                    
                    # Store for Log
                    accumulated_messages.append({
                        "sender": sender,
                        "content": last_msg.content,
                        "type": "agent_message"
                    })

                    # Stream to Frontend
                    data = json.dumps({
                        "type": "message",
                        "sender": sender,
                        "content": last_msg.content
                    })
                    yield f"data: {data}\n\n"
                
                # 2. Handle Judge Verdict
                if node_name == "Judge":
                    # Capture the full winner object from the state update
                    winner_info = state_update.get("winner")
                    final_winner_data = winner_info

                    # Stream to Frontend
                    data = json.dumps({
                        "type": "verdict",
                        "winner": winner_info
                    })
                    yield f"data: {data}\n\n"
                
                await asyncio.sleep(0.5)

        # --- SAVE LOG BEFORE FINISHING ---
        if final_winner_data:
            save_debate_log(topic, accumulated_messages, final_winner_data)
        else:
            print("⚠️ No winner data found to save.")

        yield "data: [DONE]\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")