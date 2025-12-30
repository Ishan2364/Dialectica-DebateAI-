import argparse
import sys
import uuid
import time
from app.graph import app as debate_graph, generate_dag_image
from app.utils import setup_logger, log_transition

def run_debate():
    parser = argparse.ArgumentParser(description="Groq AI Debate System")
    parser.add_argument("--topic", type=str, help="Topic for the debate")
    parser.add_argument("--dag", action="store_true", help="Generate DAG image")
    args = parser.parse_args()

    if args.dag:
        generate_dag_image()
        if not args.topic:
            return

    topic = args.topic
    if not topic:
        topic = input("Enter debate topic: ").strip()

    print(f"\n--- Starting Debate on: '{topic}' (Model: Llama-3.3-70B) ---\n")
    
    session_id = time.strftime("%Y%m%d_%H%M%S")
    logger, log_path = setup_logger(session_id)
    
    initial_state = {
        "topic": topic,
        "messages": [],
        "round_count": 0,
        "winner": None,
        "rationale": None
    }

    current_state = initial_state
    
    for event in debate_graph.stream(initial_state):
        for node_name, state_update in event.items():
            if "messages" in state_update and state_update["messages"]:
                last_msg = state_update["messages"][-1]
                sender = "Agent A" if node_name == "AgentA" else "Agent B"
                print(f"\033[1m[{sender}]:\033[0m {last_msg.content}")
                print("-" * 50)
            
            if node_name == "Judge":
                print(f"\n\033[92m[JUDGE VERDICT]\033[0m")
                print(f"Winner: {state_update.get('winner')}")
                print(f"Reason: {state_update.get('rationale')}")

            log_transition(logger, node_name, state_update)

    print(f"\nFull log saved to: {log_path}")

if __name__ == "__main__":
    run_debate()