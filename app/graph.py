from langgraph.graph import StateGraph, START, END
from app.state import DebateState
from app.nodes import agent_node, judge_node
from functools import partial

workflow = StateGraph(DebateState)

# --- Node Definitions ---
# Agent A (Proposer)
agent_a = partial(
    agent_node, 
    agent_name="Agent A", 
    persona="A radical Futurist and Risk-Taker."
)

# Agent B (Opponent)
agent_b = partial(
    agent_node, 
    agent_name="Agent B", 
    persona="A pragmatic Traditionalist and Skeptic."
)

# Add Nodes to Graph
workflow.add_node("AgentA", agent_a)
workflow.add_node("AgentB", agent_b)
workflow.add_node("Judge", judge_node)

# --- Routing Logic (Dynamic) ---
def route_step(state: DebateState):
    # DYNAMIC CHECK: Use the user's limit, default to 6 if missing
    limit = state.get("max_rounds", 6)
    
    if state["round_count"] >= limit:
        return "Judge"
    if state["round_count"] % 2 == 0:
        return "AgentA"
    else:
        return "AgentB"

# --- Edges & Entry Point (CRITICAL FIX) ---

# 1. Define where the graph starts
workflow.add_edge(START, "AgentA")

# 2. Define the routing logic
workflow.add_conditional_edges(
    "AgentA",
    route_step,
    {"AgentB": "AgentB", "Judge": "Judge"}
)

workflow.add_conditional_edges(
    "AgentB",
    route_step,
    {"AgentA": "AgentA", "Judge": "Judge"}
)

# 3. Define where the graph ends
workflow.add_edge("Judge", END)

# Compile
app = workflow.compile()