---
title: 'GPT Automator: A voice-controlled personal assistant for your Mac'
date: 2023-02-13T14:49:06Z
draft: false
---

![Retro robot](https://res.cloudinary.com/cwilliams/image/upload/v1676303596/Blog/retrofuturism-style-robot-wearing-headphones-voice-controlled-line-drawing-style-comic-book-styl-.png)

The release of generative AI models—including text generation models like GPT-2 and GPT-3 and image generation models like DALL-E 2, Midjourney, and Stable Diffusion—has sparked a new wave of creativity across the Internet, with several projects and startups applying these models to various use-cases in the past few years.

I built one such project a few months ago: a desktop application called [Buzz](https://github.com/chidiwilliams/buzz) that generates audio transcripts using OpenAI’s [Whisper](https://github.com/openai/whisper) models. (Its name is an abstract reference to sound, but also unwittingly nods to the current excitement around AI technology.)

This past weekend, I attended a hackathon organised by the [Effective Altruism London community](https://effectivealtruism.uk/ealondonoverview) with my friend, [Luke Harries](https://harries.co/). As we brainstormed project ideas, we discussed my experience working on Buzz and his interest in working with [LangChain](https://github.com/hwchase17/langchain), an open-source library for composing Large Language Models (LLMs); and we settled on building a voice-controlled personal assistant we called [GPT Automator](https://github.com/chidiwilliams/GPT-Automator).

GPT Automator transcribes audio commands in natural language into text using Whisper, converts the text into AppleScript and JavaScript scripts, and then executes the scripts to control the user’s computer. We imagine it as an LLM-charged version of Mac’s [Automator](<https://en.wikipedia.org/wiki/Automator_(macOS)>), where instead of requiring the user to create workflows manually, the program directly understands the user’s instructions.

Implementation-wise, the program consists of three major components. The first is the graphical interface (GUI), built using [PyQt6](https://pypi.org/project/PyQt6/). We used a simple application window with an button to start and stop recordings and a label to view transcribed prompts and help messages.

```python
class MainWindow(QMainWindow):
    is_recording = False

    def __init__(self):
        super().__init__(flags=Qt.WindowType.Window)
        self.setWindowFlags(Qt.WindowType.WindowStaysOnTopHint)

        self.setFixedSize(275, 90)
        self.setWindowTitle("GPT Automator")

        widget = QWidget(parent=self)

        layout = QVBoxLayout()

        self.record_button = QPushButton(self.load_icon(RECORD_ICON_PATH), "Record", parent=self)
        self.record_button.clicked.connect(self.on_button_clicked)

        self.transcription_label = QLabel("Click 'Record' to begin", parent=self)

        layout.addWidget(self.record_button)
        layout.addWidget(self.transcription_label)
        widget.setLayout(layout)

        self.setCentralWidget(widget)

    def on_button_clicked(self):
        if self.is_recording:
            self.record_button.setText("Record")
            self.record_button.setIcon(self.record_icon)
            self.is_recording = False

           self.transcription_label.setText('Transcribing...')
            self.record_button.setDisabled(True)

            # Start transcription...
        else:
            # Start recording...

            self.transcription_label.setText('Listening...')
            self.record_button.setText("Stop")
            self.record_button.setIcon(self.stop_icon)
            self.is_recording = True
```

![GPT Automator](https://res.cloudinary.com/cwilliams/image/upload/v1676303619/Blog/app.png)

The second component of the application performs audio-to-text processing. When a user provides an audio prompt, the application records the input into a temporary file and then converts the audio file into text using Whisper:

```python
class MainWindow(QMainWindow):
    def on_button_clicked(self):
      if self.is_recording:
          # ...
          self.transcription_thread = Thread(target=self.transcribe_recording)
          self.transcription_thread.start()
      else:
          self.recording_thread = Thread(target=self.start_recording)
          self.recording_thread.start()

    def start_recording(self):
        device = sounddevice.query_devices(kind='input')

        self.temp_file_path = os.path.join(tempfile.gettempdir(), f'{uuid.uuid1()}.wav')
        print(f'Temporary recording path: {self.temp_file_path}')

        with soundfile.SoundFile(self.temp_file_path, mode='x', samplerate=int(device['default_samplerate']),
                                channels=1) as file:
            with sounddevice.InputStream(channels=1, callback=self.recording_callback, device=device['index'],
                                        dtype="float32"):
                while self.is_recording:
                    file.write(self.queue.get())

    def recording_callback(self, in_data, frames, time, status):
        self.queue.put(in_data.copy())

    def transcribe_recording(self):
        model = whisper.load_model("base")
        result = model.transcribe(audio=self.temp_file_path, language="en", task="transcribe")

        text = result["text"]
        print(f'Transcribed text: {text}')

        if text is None:
            self.transcription_label.setText('No text found. Please try again.')
        else:
            execute(result["text"])
```

The final component executes the text prompt. First, it converts the prompt into AppleScript using a sequence of LangChain “tools”:

```python
from langchain.agents import tool

@tool
def computer_applescript_action(apple_script):
    """
    Use this when you want to execute a command on the computer. The command should be in AppleScript.

    Always start with starting the app and activating it.

    If it's a calculation, use the calculator app.

    Use delay 0.5 between keystrokes.

    When possible click buttons instead of typing.

    Here are some examples of good AppleScript commands:

    Command: Create a new page in Notion
    AppleScript: tell application "Notion"
        activate
        delay 0.5
        tell application "System Events" to keystroke "n" using {{command down}}
    end tell

    Command: Search for a table nearby
    AppleScript: tell application "Google Chrome"
        activate
        delay 0.5
        open location "https://www.google.com/search?q=Table+nearby"
    end tell

    The AppleScript should be valid including quotations.

    Write the AppleScript for the Command:
    Command:
    """
    print("Running\n", apple_script)

    return run_applescript(apple_script)

@tool
def chrome_open_url(url):
    """
    Use this tool to open a URL in Chrome. It is recommended to use this tool before doing any other actions on Chrome.

    The URL should be a string. For example: https://gmail.com
    """
    script = f'''
    tell application "Google Chrome"
        open location "{url}"
    end tell
    '''

    return run_applescript(script)

# Other actions for reading browser pages, running JavaScript, etc...

def run_applescript(applescript):
    p = subprocess.Popen(['osascript', '-'], stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE)

    stdout, stderr = p.communicate(applescript.encode('utf-8'))

    if p.returncode != 0:
        raise Exception(stderr)

    decoded_text = stdout.decode("utf-8")

    return decoded_text


def say_text(text):
    run_applescript(f'say "{text}"')


def execute(command):
    llm = OpenAI(temperature=0)

    tools = [
        computer_applescript_action,
        chrome_open_url,
        # ...
    ]

    agent = initialize_agent(tools, llm, agent="zero-shot-react-description", verbose=True)

    result = agent.run(command)

    if result:
        say_text(f'The result is {result}')
    else:
        say_text(f'Finished doing {command}')
```

LangChain uses the functions annotated with `@langchain.agents.tool` as [tools](https://langchain.readthedocs.io/en/latest/modules/agents/tools.html?highlight=tools#tools), interpreting their docstrings as prompts to be fed to GPT-3. When run, the LangChain agent executes each tool, which effectively creates an AppleScript program representing the user’s request, runs the program, and then audibly responds to the user.

The demo gods smiled upon us at the hackathon, and at the end of the event, we showed how a user could instruct GPT Automator to calculate a math expression or find nearby restaurants.

We’ve open-sourced GPT Automator [on GitHub](https://github.com/chidiwilliams/GPT-Automator), with the caveat that this work was made as a proof-of-concept and is not intended for production use. Concretely, the program executes code generated from natural language prompts and may be susceptible to prompt injection attacks. It may also produce unexpected behaviour from presumably safe but malformed prompts.

Yet, we hope this work helps more people learn about LLMs and explore diverse ways of interacting with them.

_Luke has also shared a write-up on GPT Automator [on his blog](https://harries.co/ea-hackathon-gpt-automator-and-langchain/)._

![Picture of Luke and I presenting](https://res.cloudinary.com/cwilliams/image/upload/v1676303630/Blog/39DDA8D1-BE99-4232-9AA8-337021B59527.jpg)
