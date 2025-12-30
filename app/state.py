from typing import List, Annotated, TypedDict
from langchain_core.messages import BaseMessage
import operator

class DebateState(TypedDict):
    topic: str
    messages: Annotated[List[BaseMessage], operator.add]
    round_count: int
    winner: str
    rationale: str
    agent_a_persona: str 
    agent_b_persona: str
    max_rounds: int  