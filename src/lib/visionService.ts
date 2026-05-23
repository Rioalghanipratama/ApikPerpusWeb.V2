export interface FaceAnalysis {
  description: string;
  mood: string;
  detectionAccuracy: number;
  isObstructed: boolean;
  friendlyMessage: string;
}

export interface BookScan {
  title: string;
  author: string;
  isbn: string;
  category: string;
  summary: string;
}

export const visionService = {
  async analyzeFace(imageData: string): Promise<FaceAnalysis> {
    const response = await fetch('/api/vision/analyze-face', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: imageData }),
    });
    
    if (!response.ok) throw new Error('Face analysis failed');
    return response.json();
  },

  async scanBook(imageData: string): Promise<BookScan> {
    const response = await fetch('/api/vision/scan-book', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: imageData }),
    });
    
    if (!response.ok) throw new Error('Book scan failed');
    return response.json();
  }
};
