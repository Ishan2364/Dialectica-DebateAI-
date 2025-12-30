import argparse
import sys
import time
# Import the shared graph from the app package
from app.graph import app as debate_graph

def main():
    print("\n==========================================")
    print("      DEBATE AI - TERMINAL MODE           ")
    print("==========================================")
    
    # 1. Get User Input
    topic = input("Enter debate topic: ").strip()
    if not topic:
        print("Topic cannot be empty.")
        return

    try:
        rounds = int(input("Enter max rounds (default 6): ").strip() or 6)
    except ValueError:
        rounds = 6

    print(f"\n[INFO] Initializing debate on: '{topic}' ({rounds} rounds)")
    print("[INFO] Press Ctrl+C to exit early.\n")
    
    # 2. Initialize State
    initial_state = {
        "topic": topic,
        "messages": [],
        "round_count": 0,
        "winner": None,
        "rationale": None,
        "agent_a_persona": "Default",
        "agent_b_persona": "Default",
        "max_rounds": rounds
    }

    # 3. Run the Graph Loop
    try:
        for event in debate_graph.stream(initial_state):
            for node_name, state_update in event.items():
                
                # Handle Agent Output
                if node_name in ["AgentA", "AgentB"]:
                    if "messages" in state_update and state_update["messages"]:
                        last_msg = state_update["messages"][-1]
                        sender = "Agent A" if node_name == "AgentA" else "Agent B"
                        
                        # Print formatted output
                        print(f"\n[{sender}]:")
                        print(f"{last_msg.content}")
                        print("-" * 50)
                        
                        # Small delay for readability
                        time.sleep(0.5)
                
                # Handle Judge Output
                if node_name == "Judge":
                    winner_data = state_update.get("winner", {})
                    print("\n" + "="*20 + " JUDGE VERDICT " + "="*20)
                    
                    if isinstance(winner_data, dict):
                        print(f"WINNER:   {winner_data.get('winner', 'Undecided')}")
                        print(f"REASON:   {winner_data.get('rationale', 'No rationale provided')}")
                        
                        # Print Scores if available
                        scores = winner_data.get("scores", {})
                        if scores:
                            print("\nSCORES:")
                            for agent, metrics in scores.items():
                                print(f"  {agent}: {metrics}")
                    else:
                        # Fallback if simple string
                        print(f"WINNER:   {winner_data}")

                    print("="*55 + "\n")

    except KeyboardInterrupt:
        print("\n[INFO] Debate interrupted by user.")
    except Exception as e:
        print(f"\n[ERROR] An error occurred: {e}")

if __name__ == "__main__":
    main()