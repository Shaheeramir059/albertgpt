import os
import json
from flask import Flask, request, jsonify, render_template
from transformers import AlbertTokenizer, AlbertForSequenceClassification
import torch

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

# Initialize globals
MODEL_PATH = 'albert_model'
tokenizer = None
model = None
dataset = None

def initialize_app():
    global tokenizer, model, dataset
    try:
        if tokenizer is None:
            tokenizer = AlbertTokenizer.from_pretrained(
                MODEL_PATH, 
                local_files_only=True,
                use_fast=True
            )
        if model is None:
            model = AlbertForSequenceClassification.from_pretrained(
                MODEL_PATH,
                local_files_only=True,
                torch_dtype=torch.float32,
                low_cpu_mem_usage=True
            )
        if dataset is None:
            with open('wikipedia_dataset.json', 'r') as f:
                dataset = json.load(f)
        return True
    except Exception as e:
        print(f"Initialization error: {e}")
        return False

# Initialize when the application starts
initialize_app()

@app.route("/analyze", methods=["POST"])
def analyze_text():
    global tokenizer, model, dataset
    if None in (tokenizer, model, dataset):
        initialize_app()
    data = request.json
    text = data.get("text", "")

    if not text:
        return jsonify({"error": "No text provided"}), 400

    # Step 1: Model Analysis
    inputs = tokenizer(text, return_tensors="pt", truncation=True, padding=True, max_length=512)
    outputs = model(**inputs)
    probs = torch.softmax(outputs.logits, dim=-1).detach().numpy()[0]

    # Interpretation of model output (probabilities)
    model_analysis = {
        "class_0_prob": float(probs[0]),
        "class_1_prob": float(probs[1])
    }

    # Step 2: Dataset Search with natural language processing
    matching_results = []
    # Convert question to search terms
    query = text.lower()
    search_terms = query.replace("what do you think about", "")\
                      .replace("what are your thoughts on", "")\
                      .replace("how would you explain", "")\
                      .replace("what is", "")\
                      .replace("tell me about", "")\
                      .replace("explain", "")\
                      .strip()
    
    for entry in dataset:
        # Search for the term in title and content
        if search_terms in entry["Title"].lower() or search_terms in entry["Content"].lower():
            matching_results.append({
                "title": entry["Title"],
                "content": entry["Content"]
            })

    # No matching content found
    if not matching_results:
        dataset_result = "No matching content found."
    else:
        dataset_result = matching_results

    # Return the model's analysis and the dataset result
    return jsonify({
        "model_analysis": model_analysis,
        "dataset_result": dataset_result
    })

if __name__ == "__main__":
    try:
        # Verify model is loaded before starting server
        if not model or not tokenizer:
            raise RuntimeError("Failed to load AI model")
        # Start server with production configuration
        port = int(os.environ.get('PORT', 80))
        app.run(host='0.0.0.0', port=port, threaded=True)
    except Exception as e:
        print(f"Startup error: {e}")
        exit(1)
