import os
from langchain_core.runnables.graph import MermaidDrawMethod
from app.graph import app as debate_graph

def generate():
    print("Generating Graph...")
    
    # 1. Ensure the 'outputs' folder exists
    output_dir = "outputs"
    os.makedirs(output_dir, exist_ok=True)
    
    # 2. Define the path
    file_path = os.path.join(output_dir, "debate_dag.png")

    # 3. Generate and Save
    try:
        # Get the graph image data
        png_data = debate_graph.get_graph().draw_mermaid_png(
            draw_method=MermaidDrawMethod.API,
        )
        
        # Write to file
        with open(file_path, "wb") as f:
            f.write(png_data)
            
        print(f"Success! Graph saved to: {file_path}")
        
    except Exception as e:
        print(f"Error generating graph: {e}")

if __name__ == "__main__":
    generate()