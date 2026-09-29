export const categories = ['OpenAI / GPT', 'Anthropic / Claude', 'Google / Gemini', 'xAI / Grok', 'Open Source LLM', 'Local LLM', 'AI Agents', 'Vibe Coding', 'AI Programming', 'Image Generation', 'Video Generation', 'Voice AI', 'AI Research', 'Benchmark', 'Prompt Engineering', 'API Development', 'AI News', 'AI Hardware', '자유게시판'];
export const languages = { ko: '한국어', en: 'English', ja: '日本語' };
export const models = [
    { id: 'gpt', name: 'GPT', company: 'OpenAI', color: '#8cd9c5', symbol: '◎', desc: 'Multimodal conversations, reasoning & tools', url: 'https://platform.openai.com/docs' },
    { id: 'claude', name: 'Claude', company: 'Anthropic', color: '#e3a17f', symbol: '✳', desc: 'Thoughtful writing, coding & agent workflows', url: 'https://docs.anthropic.com' },
    { id: 'gemini', name: 'Gemini', company: 'Google', color: '#8ba9ff', symbol: '✦', desc: 'Multimodal intelligence across your workflow', url: 'https://ai.google.dev/gemini-api/docs' },
    { id: 'grok', name: 'Grok', company: 'xAI', color: '#d9e0ed', symbol: '𝕏', desc: 'Explore ideas, reasoning & conversation', url: 'https://docs.x.ai' },
    { id: 'qwen', name: 'Qwen', company: 'Alibaba', color: '#ac95f4', symbol: '⬡', desc: 'Open models for builders and researchers', url: 'https://github.com/QwenLM' },
    { id: 'llama', name: 'Llama', company: 'Meta', color: '#70afff', symbol: '∞', desc: 'Open-weight models, built together', url: 'https://www.llama.com' },
    { id: 'deepseek', name: 'DeepSeek', company: 'DeepSeek', color: '#7c98ff', symbol: '≈', desc: 'Reasoning and code from an open ecosystem', url: 'https://api-docs.deepseek.com' },
];
export const tags = ['GPT-6', 'Claude Opus', 'Gemini', 'Grok', 'Qwen', 'Llama', 'DeepSeek'];
export const examples = [
    ['오늘의 AI 떡밥: 벤치마크보다 실제로 쓰는 느낌이 더 중요한가?', '점수는 높은데 내가 쓰는 작업에서는 다르게 느껴질 때가 있죠. 여러분은 모델을 고를 때 무엇을 먼저 보나요?\n\n**테스트 조건과 실제 예시**를 함께 공유해주세요.', '자유게시판', 'GPT-6,Claude Opus', 'ko', 'ga_on'],
    ['I tested the same coding task across 3 models. Here’s my rubric.', 'Instead of picking a winner, I scored correctness, test coverage, and how much editing I needed.\n\n```python\ncriteria = ["correctness", "tests", "edits"]\nfor criterion in criteria:\n    print(criterion)\n```\n\nWhat would you add to this evaluation?', 'Benchmark', 'Claude Opus,Gemini,GPT-6', 'en', 'alex.dev'],
    ['8GB VRAM으로 로컬 LLM 돌리는 사람들, 세팅 공유 ㄱㄱ', '모델 크기, 양자화 방식, 컨텍스트 길이까지 같이 적어보자. 장비마다 차이가 크니까 토큰 속도만 비교하지 말고요.', 'Local LLM', 'Qwen,Llama', 'ko', 'tensor_kim'],
    ['Agents are easy to demo. Making them reliable is the hard part.', 'How do you handle retries, tool permissions and human review? Share one failure you learned from.', 'AI Agents', 'Claude Opus', 'en', 'maya.builds'],
    ['Claude 업데이트 체감, 다들 어떤 작업으로 비교함?', '이번 Claude 업데이트 말귀 진짜 잘 알아듣는 듯. 다만 내 주관이라 같은 프롬프트로 비교해보고 싶음. 여러분 테스트도 궁금합니다.', 'Anthropic / Claude', 'Claude Opus', 'ko', 'prompting'],
    ['小さいモデルで日本語の要約を試してみた', '同じ文章でモデルを比較するとき、速度だけでなく情報の抜けも確認しています。皆さんの評価方法を教えてください。', 'Open Source LLM', 'Qwen,DeepSeek', 'ja', 'yuki.ai'],
    ['Show your weekend build: one project, one lesson', 'A space for small projects. What did you build, and what would you do differently next time?', 'Vibe Coding', 'GPT-6', 'en', 'sam.codes'],
    ['프롬프트에 예시 몇 개 넣는 게 제일 효과 있었음', '역할 설명만 길게 적기보다 원하는 출력 예시를 두 개 주니까 훨씬 안정적이었음. 어떤 방식 쓰고 계신가요?', 'Prompt Engineering', 'Gemini', 'ko', 'haeun'],
];
