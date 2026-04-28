import pdfplumber
import numpy as np
from sentence_transformers import SentenceTransformer

_similarity_model = None

def get_model():
    """
    Lazy Loader: Checks if the model is already in RAM
    If it is, just return the existing model
    """
    global _similarity_model
    if _similarity_model is None:
        print("Loading BGE-base model for the first time... Might take some time")
        _similarity_model = SentenceTransformer("BAAI/bge-base-en-v1.5")
        print("Model loaded successfully!")
    return _similarity_model

def extract_text_from_pdf(file_path):
    #Reads text page by page and returns the combined raw string
    
    text = ""
    try:
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
        return text.strip()
    except Exception as e:
        print(f"Error reading PDF {file_path}: {e}")
        return None

def get_embedding(text):
    #Converts a raw string of text into a 768-dimensional numerical array (embedding).
    
    if not text:
        return None
        
    instruction = "Represent this sentence for searching relevant passages: "
    model = get_model()
    
    return model.encode([instruction + text], normalize_embeddings=True)[0]

def calculate_similarity(new_embedding, existing_embeddings):
    #Calculates how similar a new project is to all existing projects in the database.
    
    if not existing_embeddings:
        return []
        
    matrix = np.vstack(existing_embeddings)
    similarities = np.dot(matrix, new_embedding)
    
    return similarities