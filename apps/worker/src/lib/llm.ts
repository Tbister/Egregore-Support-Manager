interface LLMOptions {
  apiKey: string;
  model: string;
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
}

export async function callLLM({
  apiKey,
  model,
  systemPrompt,
  userPrompt,
  temperature = 0.3,
  maxTokens = 1000
}: LLMOptions): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature,
      max_tokens: maxTokens,
      response_format: { type: 'json_object' }
    })
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }
  
  const data = await response.json();
  return data.choices[0].message.content;
}

// Alternative: Use Cloudflare AI (if configured)
export async function callCloudflareAI(
  ai: any, // Cloudflare AI binding
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];
  
  const response = await ai.run('@cf/meta/llama-2-7b-chat-int8', {
    messages,
    temperature: 0.3,
    max_tokens: 1000
  });
  
  return response.response;
}