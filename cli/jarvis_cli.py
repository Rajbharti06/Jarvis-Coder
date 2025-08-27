import requests
from rich.console import Console
from rich.markdown import Markdown
from prompt_toolkit import PromptSession
from prompt_toolkit.history import FileHistory
import re

class JarvisCLI:
    def __init__(self):
        self.console = Console()
        self.session = PromptSession(history=FileHistory('.jarvis_history'))
        self.api_url = "http://localhost:8000"  # Make sure this matches your backend URL
        self.current_model = None

    def run(self):
        self.console.print("[bold green]Welcome to Jarvis Coder![/bold green]")
        self.console.print("Type your prompts below. Type 'exit' or 'quit' to end.")
        self.console.print("Use `/model <model_name>` to switch models.")
        self.console.print("Use `@<model_name> <prompt>` to use a model for a single prompt.")


        while True:
            try:
                prompt = self.session.prompt(">>> ")
                if prompt.lower() in ['exit', 'quit']:
                    break
                
                if prompt.startswith('/'):
                    self.handle_command(prompt)
                else:
                    self.handle_prompt(prompt)

            except KeyboardInterrupt:
                break
            except EOFError:
                break

    def handle_command(self, command):
        parts = command.split()
        cmd = parts[0]
        args = parts[1:]

        if cmd == '/model':
            if len(args) == 1:
                self.current_model = args[0]
                self.console.print(f"Switched to model: [bold yellow]{self.current_model}[/bold yellow]")
            else:
                self.console.print("[bold red]Usage:[/bold red] /model <model_name>")
        elif cmd == '/key':
            self.console.print("[bold red]Error:[/bold red] This feature is not yet implemented.")
        elif cmd == '/files':
            try:
                response = requests.get(f"{self.api_url}/api/files")
                response.raise_for_status()
                files_data = response.json()
                if files_data and 'files' in files_data:
                    self.console.print("[bold blue]Files in workspace:[/bold blue]")
                    for item in files_data['files']:
                        self.console.print(f"- {item}")
                else:
                    self.console.print("[bold yellow]No files found in workspace.[/bold yellow]")
            except requests.exceptions.RequestException as e:
                self.console.print(f"[bold red]Error listing files:[/bold red] {e}")
        elif cmd == '/read':
            if len(args) == 1:
                file_path = args[0]
                try:
                    response = requests.get(f"{self.api_url}/api/files/{file_path}")
                    response.raise_for_status()
                    file_data = response.json()
                    if file_data and 'content' in file_data:
                        self.console.print(f"[bold blue]Content of {file_path}:[/bold blue]")
                        self.console.print(file_data['content'])
                    else:
                        self.console.print(f"[bold yellow]Could not read content for {file_path}.[/bold yellow]")
                except requests.exceptions.HTTPError as e:
                    if e.response.status_code == 404:
                        self.console.print(f"[bold red]File not found:[/bold red] {file_path}")
                    else:
                        self.console.print(f"[bold red]Error reading file:[/bold red] {e}")
                except requests.exceptions.RequestException as e:
                    self.console.print(f"[bold red]Error reading file:[/bold red] {e}")
            else:
                self.console.print("[bold red]Usage:[/bold red] /read <file_path>")
        else:
            self.console.print(f"[bold red]Unknown command:[/bold red] {cmd}")

    def handle_prompt(self, prompt):
        model_to_use = self.current_model if self.current_model else "default"
        
        # Check for single-use model override
        match = re.match(r"@(\w+)\s+(.*)", prompt)
        if match:
            model_to_use = match.group(1)
            prompt = match.group(2)

        try:
            with requests.post(
                f"{self.api_url}/api/chat",
                json={"message": prompt, "model": model_to_use},
                stream=True,  # Enable streaming
                headers={
                    "accept": "text/event-stream",
                    "Content-Type": "application/json"
                }
            ) as response:
                response.raise_for_status()  # Raise an exception for HTTP errors
                
                # Process streamed response
                for chunk in response.iter_content(chunk_size=1):
                    if chunk:
                        try:
                            # Assuming the backend sends plain text chunks or event-stream data
                            # For simplicity, we'll just print the chunk directly.
                            # In a real application, you might parse SSE (Server-Sent Events)
                            # if the backend is sending them.
                            self.console.print(chunk.decode('utf-8'), end="")
                        except UnicodeDecodeError:
                            # Handle cases where a chunk might not be a complete UTF-8 character
                            self.console.print(chunk.decode('latin-1', errors='ignore'), end="")
                self.console.print() # New line after streamed response

        except requests.exceptions.RequestException as e:
            self.console.print(f"[bold red]Error communicating with backend:[/bold red] {e}")
        except Exception as e:
            self.console.print(f"[bold red]An unexpected error occurred:[/bold red] {e}")


if __name__ == "__main__":
    cli = JarvisCLI()
    cli.run()
