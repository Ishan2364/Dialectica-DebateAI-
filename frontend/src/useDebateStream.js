import { useState, useRef } from 'react';

// ... imports ...

export const useDebateStream = () => {
  // ... state definitions ...
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState('idle');
  const [winner, setWinner] = useState(null);
  const eventSourceRef = useRef(null);

  // Add 'rounds' argument
  const startDebate = (topic, agentAPersona, agentBPersona, rounds) => {
    setMessages([]);
    setWinner(null);
    setStatus('active');

    if (eventSourceRef.current) eventSourceRef.current.close();

    // Pass rounds to backend
    const url = `http://localhost:8000/start_debate?topic=${encodeURIComponent(topic)}&agent_a=${encodeURIComponent(agentAPersona)}&agent_b=${encodeURIComponent(agentBPersona)}&rounds=${rounds}`;
    
    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

   eventSource.onmessage = (event) => {
        if (event.data === "[DONE]") {
          eventSource.close();
          setStatus('finished');
          return;
        }
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'message') {
            setMessages((prev) => [...prev, {
              id: Date.now(),
              sender: data.sender,
              content: data.content,
              isAgentA: data.sender === 'Agent A'
            }]);
          } 
          else if (data.type === 'verdict') {
            // --- ADD THIS LOGGING LINE ---
            console.log("🔴 [DEBUG] FRONTEND RECEIVED VERDICT:", data); 
            // -----------------------------
            setWinner(data);
          }
        } catch (err) {
          console.error("Parse error:", err);
        }
      };
  
      eventSource.onerror = (err) => {
        console.error("Stream error:", err);
        eventSource.close();
        setStatus('error');
      };
  };

  return { messages, status, winner, startDebate };
};