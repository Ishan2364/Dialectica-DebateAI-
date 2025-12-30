FROM python:3.11-slim

WORKDIR /app

# Install system dependencies (Graphviz for DAG generation)
RUN apt-get update && apt-get install -y graphviz && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY . .

# Entrypoint
ENTRYPOINT ["python", "-m", "app.main"]