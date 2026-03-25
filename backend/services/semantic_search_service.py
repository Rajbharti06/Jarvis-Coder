import os
import chromadb
from chromadb.utils import embedding_functions
from typing import List, Dict, Any
import logging
from backend.services.workspace_service import WORKSPACE_DIR

logger = logging.getLogger(__name__)

class SemanticSearchService:
    """Service for project-wide semantic search and intelligence."""
    
    def __init__(self):
        self._client = None
        self._ef = None
        self._collection = None

    def _ensure_initialized(self):
        """Lazy load ChromaDB to save memory on 8GB machines until search is actually used."""
        if self._client is None:
            logger.info("Initializing ChromaDB (Lazy Load)...")
            client = chromadb.PersistentClient(path="./chroma_db")
            self._client = client
            self._ef = embedding_functions.SentenceTransformerEmbeddingFunction(model_name="all-MiniLM-L6-v2")
            self._collection = client.get_or_create_collection(
                name="codebase",
                embedding_function=self._ef
            )

    @property
    def collection(self):
        self._ensure_initialized()
        return self._collection  # type: ignore

    def index_project(self):
        """Recursively index all files in the workspace."""
        logger.info("Indexing project for semantic search...")
        
        documents = []
        metadatas = []
        ids = []
        
        for root, dirs, files in os.walk(WORKSPACE_DIR):
            dirs[:] = [d for d in dirs if d not in {".git", "__pycache__", "node_modules", "venv", ".env"}]  # type: ignore
            for file in files:
                if file.endswith(('.py', '.js', '.ts', '.tsx', '.jsx', '.html', '.css', '.md')):
                    file_path = os.path.join(root, file)
                    rel_path = os.path.relpath(file_path, WORKSPACE_DIR)
                    try:
                        with open(file_path, 'r', encoding='utf-8') as f:
                            content = f.read()
                            # Chunking: for now, one chunk per file (better to chunk by function/class)
                            # To avoid too large documents, we take first 10k chars
                            documents.append(content[:10000])  # type: ignore 
                            metadatas.append({"path": rel_path})
                            ids.append(rel_path)
                    except Exception as e:
                        logger.error(f"Error indexing {rel_path}: {e}")

        if ids:
            # Upsert into collection
            self.collection.upsert(
                documents=documents,
                metadatas=metadatas,
                ids=ids
            )
            logger.info(f"Indexed {len(ids)} files.")

    def search(self, query: str, n_results: int = 5) -> List[Dict[str, Any]]:
        """Search the codebase for semantic matches."""
        results = self.collection.query(
            query_texts=[query],
            n_results=n_results
        )
        
        formatted_results = []
        if results['ids']:
            for i in range(len(results['ids'][0])):
                formatted_results.append({
                    "id": results['ids'][0][i],
                    "path": results['metadatas'][0][i]['path'],
                    "distance": results['distances'][0][i] if 'distances' in results else 0,
                    "snippet": results['documents'][0][i][:200] + "..."
                })
        return formatted_results

semantic_search = SemanticSearchService()
