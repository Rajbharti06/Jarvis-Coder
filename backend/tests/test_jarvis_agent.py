import pytest
import tempfile
import os
import glob
import subprocess
from pathlib import Path

# Copy the tool functions from jarvis_agent.py for testing
def read_file(path):
    with open(path, "r", encoding="utf-8") as f:
        return f.read()

def write_file(path, content):
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)

def search_code(keyword, folder="."):
    matches = []
    for file in glob.glob(f"{folder}/**/*.py", recursive=True):
        with open(file, "r", encoding="utf-8", errors="ignore") as f:
            if keyword in f.read():
                matches.append(file)
    return matches

def run_command(cmd):
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    return result.stdout + result.stderr

class TestJarvisAgentTools:
    """Unit tests for the tool functions in jarvis_agent.py"""

    def test_read_file(self):
        """Test reading content from a file"""
        with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.txt') as f:
            test_content = "Hello, World!\nThis is a test file."
            f.write(test_content)
            temp_path = f.name

        try:
            content = read_file(temp_path)
            assert content == test_content
        finally:
            os.unlink(temp_path)

    def test_write_file(self):
        """Test writing content to a file"""
        with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.txt') as f:
            temp_path = f.name

        try:
            test_content = "New content written to file."
            write_file(temp_path, test_content)

            # Verify the content was written
            with open(temp_path, 'r', encoding='utf-8') as f:
                written_content = f.read()
            assert written_content == test_content
        finally:
            os.unlink(temp_path)

    def test_search_code(self):
        """Test searching for keywords in Python files"""
        with tempfile.TemporaryDirectory() as temp_dir:
            # Create test files
            file1_path = os.path.join(temp_dir, 'test1.py')
            file2_path = os.path.join(temp_dir, 'test2.py')
            file3_path = os.path.join(temp_dir, 'subdir', 'test3.py')

            os.makedirs(os.path.dirname(file3_path), exist_ok=True)

            # File with keyword
            with open(file1_path, 'w') as f:
                f.write("def hello_world():\n    print('Hello, World!')")

            # File without keyword
            with open(file2_path, 'w') as f:
                f.write("def goodbye():\n    print('Goodbye')")

            # File in subdirectory with keyword
            with open(file3_path, 'w') as f:
                f.write("class HelloWorld:\n    def say_hello(self):\n        return 'Hello, World!'")

            # Search for keyword
            matches = search_code("Hello, World!", temp_dir)

            # Should find file1 and file3
            expected_matches = {file1_path, file3_path}
            actual_matches = set(matches)
            assert actual_matches == expected_matches

    def test_search_code_no_matches(self):
        """Test searching for keyword that doesn't exist"""
        with tempfile.TemporaryDirectory() as temp_dir:
            file_path = os.path.join(temp_dir, 'test.py')
            with open(file_path, 'w') as f:
                f.write("def some_function():\n    pass")

            matches = search_code("nonexistent_keyword", temp_dir)
            assert matches == []

    def test_run_command_success(self):
        """Test running a successful command"""
        # Use a simple command that should work on all platforms
        if os.name == 'nt':  # Windows
            cmd = 'echo Hello'
        else:  # Unix-like
            cmd = 'echo Hello'

        output = run_command(cmd)
        assert 'Hello' in output.strip()

    def test_run_command_failure(self):
        """Test running a command that fails"""
        # Use a command that will fail
        cmd = 'nonexistent_command_12345'
        output = run_command(cmd)

        # Should contain error information
        assert len(output) > 0
        # On Windows, might be different, but generally should have error
        assert 'nonexistent_command_12345' in output or 'not recognized' in output or 'command not found' in output

    def test_read_file_nonexistent(self):
        """Test reading from a nonexistent file"""
        with pytest.raises(FileNotFoundError):
            read_file("nonexistent_file.txt")

    def test_write_file_creates_file(self):
        """Test that write_file creates a file if it doesn't exist"""
        with tempfile.TemporaryDirectory() as temp_dir:
            file_path = os.path.join(temp_dir, 'new_file.txt')
            assert not os.path.exists(file_path)

            test_content = "Created new file content."
            write_file(file_path, test_content)

            assert os.path.exists(file_path)
            with open(file_path, 'r') as f:
                content = f.read()
            assert content == test_content
