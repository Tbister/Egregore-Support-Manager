import type { 
  ParseResult, 
  SearchRequest, 
  SearchResult, 
  ValidationRequest, 
  ValidationResult 
} from '@egregore/shared';

export class PiClient {
  private baseUrl: string;
  
  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
  }
  
  async parse(text: string): Promise<ParseResult> {
    const response = await fetch(`${this.baseUrl}/parse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Pi parse failed: ${response.status} - ${error}`);
    }
    
    return response.json();
  }
  
  async search(request: SearchRequest): Promise<SearchResult> {
    const response = await fetch(`${this.baseUrl}/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Pi search failed: ${response.status} - ${error}`);
    }
    
    return response.json();
  }
  
  async validate(request: ValidationRequest): Promise<ValidationResult> {
    const response = await fetch(`${this.baseUrl}/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Pi validate failed: ${response.status} - ${error}`);
    }
    
    return response.json();
  }
  
  async getDocument(id: number): Promise<any> {
    const response = await fetch(`${this.baseUrl}/doc/${id}`);
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Pi getDocument failed: ${response.status} - ${error}`);
    }
    
    return response.json();
  }
  
  async getPage(docId: number, page: number): Promise<any> {
    const response = await fetch(`${this.baseUrl}/doc/page/${docId}/${page}`);
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Pi getPage failed: ${response.status} - ${error}`);
    }
    
    return response.json();
  }
}