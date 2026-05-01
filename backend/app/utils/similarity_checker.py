import pdfplumber
import numpy as np
import requests
import os
import time  # 🟢 Added this so Python can "sleep"

# Grab the secret token from your local .env file
HF_TOKEN = os.getenv("HF_TOKEN")

# The URL to HuggingFace's free supercomputer
API_URL = "https://router.huggingface.co/hf-inference/models/sentence-transformers/all-MiniLM-L6-v2/pipeline/feature-extraction"

def extract_text_from_pdf(file_path):
    text = ""
    try:
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
        return text.strip()
    except Exception as e:
        print(f"Error reading PDF: {e}")
        return None

# 🟢 Upgraded function with a retry mechanism and timeout
def get_embedding(text, max_retries=3):
    if not text:
        return None
        
    instruction = "Represent this sentence for searching relevant passages: "
    payload = {"inputs": instruction + text}
    headers = {"Authorization": f"Bearer {HF_TOKEN}"}
    
    for attempt in range(max_retries):
        try:
            # 🟢 Added a strict 15-second timeout so it never hangs infinitely
            response = requests.post(API_URL, headers=headers, json=payload, timeout=15)
            
            # 🟢 If HuggingFace is sleeping, catch it BEFORE it crashes
            if response.status_code == 503:
                print(f"Attempt {attempt + 1}: HuggingFace model is warming up. Sleeping for 15s...")
                time.sleep(15)
                continue # Go back to the start of the loop and try again!
                
            # If it's a real error (like a bad password), this will catch it
            response.raise_for_status() 
            
            embedding_list = response.json()
            
            if isinstance(embedding_list, dict) and "error" in embedding_list:
                print(f"Attempt {attempt + 1}: API error - {embedding_list['error']}")
                time.sleep(15)
                continue
                
            emb_array = np.array(embedding_list[0] if isinstance(embedding_list[0], list) else embedding_list)
            
            norm = np.linalg.norm(emb_array)
            if norm > 0:
                emb_array = emb_array / norm
                
            # 🟢 If we get here, we successfully got the math array! Break the loop.
            return emb_array
            
        except requests.exceptions.Timeout:
            print(f"Attempt {attempt + 1}: HuggingFace took too long to respond.")
        except Exception as e:
            print(f"API Error on attempt {attempt + 1}: {e}")
            
        # If it failed but we still have retries left, wait 5 seconds before trying again
        if attempt < max_retries - 1:
            print("Retrying...")
            time.sleep(5)
             
    print("❌ Failed to get embeddings after maximum retries.")
    return None

def calculate_similarity(new_embedding, existing_embeddings):
    if not existing_embeddings:
        return []
        
    matrix = np.vstack(existing_embeddings)
    similarities = np.dot(matrix, new_embedding)
    return similarities