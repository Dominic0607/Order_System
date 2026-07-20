import re

with open('App.tsx', 'r') as f:
    content = f.read()

# 1. We need to extract OtoChatView
# It's defined as:
# {appState === 'oto_chat' && (() => {
#    const OtoChatView = () => {
#        ...
#    };
#    return <OtoChatView />;
# })()}

oto_pattern = re.compile(
    r"\{\s*appState === 'oto_chat' && \(\(\) => \{\s*const OtoChatView = \(\) => \{(.*?)\};\s*return <OtoChatView />;\s*\}\)\(\)\s*\}",
    re.DOTALL
)

problem_pattern = re.compile(
    r"\{\s*appState === 'problem_items' && \(\(\) => \{\s*const ProblemItemsView = \(\) => \{(.*?)\};\s*return <ProblemItemsView />;\s*\}\)\(\)\s*\}",
    re.DOTALL
)

def oto_repl(m):
    return "{appState === 'oto_chat' && <OtoChatView language={language} setAppState={setAppState} />}"

def problem_repl(m):
    return "{appState === 'problem_items' && <ProblemItemsView language={language} currentUser={currentUser} />}"

oto_match = oto_pattern.search(content)
problem_match = problem_pattern.search(content)

if oto_match and problem_match:
    oto_body = oto_match.group(1)
    problem_body = problem_match.group(1)
    
    # We will inject the extracted components right before "const AppContent: React.FC = () => {"
    
    components_code = f"""
const OtoChatView = ({{ language, setAppState }}: {{ language: string, setAppState: any }}) => {{{oto_body}}};

const ProblemItemsView = ({{ language, currentUser }}: {{ language: string, currentUser: any }}) => {{
    const [loadingTime, setLoadingTime] = React.useState(0);
    React.useEffect(() => {{
        const timer = setInterval(() => setLoadingTime(prev => prev + 1), 1000);
        return () => clearInterval(timer);
    }}, []);
    {problem_body}
}};
"""
    
    # Add loadingTime to ProblemItemsView body
    components_code = components_code.replace(
        "{language === 'km' ? 'កំពុងបើក Mini App...' : 'Loading Mini App...'}",
        "{loadingTime > 5 ? (language === 'km' ? 'ម៉ាស៊ីនមេកំពុងបើកដំណើរការ សូមរង់ចាំ (អាចដល់ 50 វិនាទី)...' : 'Server is waking up, please wait (up to 50s)...') : (language === 'km' ? 'កំពុងបើក Mini App...' : 'Loading Mini App...')}"
    )

    content = oto_pattern.sub(oto_repl, content)
    content = problem_pattern.sub(problem_repl, content)
    
    content = content.replace("const AppContent: React.FC = () => {", components_code + "\nconst AppContent: React.FC = () => {")
    
    with open('App.tsx', 'w') as f:
        f.write(content)
    print("Refactored successfully")
else:
    print("Could not find the patterns.")

