export interface ChatMessage {
  role: 'user' | 'model';
  parts: [{ text: string }];
}

export const nlpService = {
  async chat(message: string, context: any, history: ChatMessage[] = []): Promise<string> {
    const response = await fetch('/api/nlp/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, context, history }),
    });

    if (!response.ok) throw new Error('Chat failed');
    const data = await response.json();
    return data.text;
  }
};
