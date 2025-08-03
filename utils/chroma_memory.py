# utils/chroma_memory.py

import chromadb
from chromadb.utils import embedding_functions
import os
import uuid
from typing import List, Dict, Optional
from chromadb.api.models.Collection import Collection

# Import the model name directly from your config file
from .embedder import EMBEDDING_MODEL_NAME

class ChromaMemory:
    """
    Manages a persistent ChromaDB vector store for the AI's memory.
    """
    collection: Collection

    def __init__(self, persist_directory: str = "./chroma_data"):
        os.makedirs(persist_directory, exist_ok=True)

        # Set up the embedding function for ChromaDB, using the name from our config
        self.embedding_function = embedding_functions.SentenceTransformerEmbeddingFunction(
            model_name=EMBEDDING_MODEL_NAME
        ) # <-- The extra parenthesis that caused the crash is removed here.
        
        # Use the modern PersistentClient for initialization
        self.client = chromadb.PersistentClient(path=persist_directory)
        
        # Get or create the collection with the specified embedding function
        self.collection = self.client.get_or_create_collection(
            name="opure_memory",
            embedding_function=self.embedding_function
        )
        # Use the bot's logger to show this message in the dashboard
        print(f"INFO: ChromaDB memory connected. Collection 'opure_memory' has {self.collection.count()} items.")

    def add(self, user_id: str, text_content: str, metadata: Optional[Dict] = None):
        """Adds a piece of text to the AI's memory."""
        doc_id = str(uuid.uuid4())
        full_metadata = {"user_id": user_id}
        if metadata:
            full_metadata.update(metadata)

        self.collection.add(
            documents=[text_content],
            metadatas=[full_metadata],
            ids=[doc_id]
        )

    def query(self, user_id: str, query_text: str, n_results: int = 5) -> List[str]:
        """Queries the memory for relevant past interactions for a specific user."""
        try:
            results = self.collection.query(
                query_texts=[query_text],
                n_results=n_results,
                where={"user_id": user_id} # Filter memories by the specific user
            )
            return results.get('documents', [[]])[0]
        except Exception:
            # If the query fails for any reason, return an empty list
            return []

    def get_all_memories_for_user(self, user_id: str) -> Dict:
        """Retrieves all memories for a given user."""
        return self.collection.get(where={"user_id": user_id})

    def clear_user_memory(self, user_id: str):
        """Deletes all memories associated with a specific user."""
        self.collection.delete(where={"user_id": user_id})