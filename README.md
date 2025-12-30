# 🤖 Dialectica AI: Autonomous Multi-Agent Debate Platform

**Dialectica AI** is a cutting-edge full-stack application that orchestrates real-time, autonomous debates between AI agents. Powered by **LangGraph** for state management and **Groq (Llama 3)** for ultra-fast inference, it features a live analytics dashboard, an "Invincible Judge" evaluation engine, and professional PDF reporting.

---

## ✨ Key Features

- **🎭 Dynamic Persona Injection:** Assign distinct personalities (e.g., "The Philosopher" vs. "The Economist") to agents and watch them adapt their arguments.
- **⚡ Real-Time Streaming:** Built with Server-Sent Events (SSE) to deliver arguments, scores, and thoughts instantly as they are generated.
- **⚖️ The "Invincible Judge":** A robust, regex-based evaluation engine that analyzes debate flow to output:
  - **Radar Charts:** Visualizing Logic, Persuasion, and Aggression.
  - **Strategic Breakdown:** Automatic extraction of key strengths and weaknesses.
  - **Winner Determination:** Mathematical scoring to determine the victor.
- **📊 Interactive Dashboard:** A beautiful React frontend using Recharts and Framer Motion for live data visualization.
- **📄 Executive PDF Reports:** One-click generation of a multi-page PDF containing the full transcript, scorecard, and executive summary.
- **🐳 Dockerized:** Fully containerized setup for zero-hassle deployment.

---

## 🛠️ Tech Stack

### **Frontend**
- **Framework:** React (Vite)
- **Styling:** Tailwind CSS
- **Visualizations:** Recharts
- **Animations:** Framer Motion

### **Backend**
- **API:** FastAPI
- **Orchestration:** LangGraph & LangChain
- **AI Engine:** Groq API (Llama 3-8b-8192)
- **Containerization:** Docker & Docker Compose

---

## 🚀 Getting Started

### **Prerequisites**
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running.
- A free [Groq API Key](https://console.groq.com/keys).

### **Installation**

1. **Clone the repository**
   ```bash
   git clone [https://github.com/Ishan2364/Dialectica-DebateAI-.git](https://github.com/Ishan2364/Dialectica-DebateAI-.git)
   cd Dialectica-DebateAI-
   
2. **Configure Environment Variables**
Create a `.env` file in the root directory and add your API key:

`'`bash
# Create .env from example
cp .env.example .env 

## 🔐 Environment Setup

Open the `.env` file and paste your Groq API key:

``env
GROQ_API_KEY=gsk_your_actual_key_here

## 🐳 Run with Docker

Build and start the system using Docker Compose:

``bash
docker-compose up --build
🌐 Access the App
Once the containers are running, open your browser and navigate to:

arduino
Copy code
http://localhost:5173
📖 Usage Guide
1. Set the Stage
Enter a debate topic.
Example:

Is AI a threat to humanity?

2. Choose Fighters
Select personas for Agent A and Agent B, or keep the default Natural persona.

3. Start Debate
Click Start Debate to initiate the discussion and watch the debate unfold in real time.

4. Analyze
Click the Analysis button to view:

Radar charts

Strengths and weaknesses breakdown

5. Export
Click Download Report to export:

Full debate transcript

Detailed analysis report (PDF)

Copy code


