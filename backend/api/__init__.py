"""API package for Jarvis backend.

Submodules (auth, chat, execute, files, patches, etc.) are imported
directly where needed, e.g.:

    from backend.api import chat, patches

This file intentionally avoids eagerly importing submodules to prevent
circular import issues and to keep test startup fast.
"""
