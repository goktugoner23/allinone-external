import { Document, DocumentChunk, DocumentMetadata } from '../types/rag';
import config from '../config';
import logger from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export interface ChunkingOptions {
  maxChunkSize?: number;
  overlapSize?: number;
  minChunkSize?: number;
  preserveParagraphs?: boolean;
  preserveSentences?: boolean;
}

export class TextChunkingService {
  private readonly defaultOptions: Required<ChunkingOptions>;

  constructor() {
    this.defaultOptions = {
      maxChunkSize: config.rag.chunking.maxChunkSize,
      overlapSize: config.rag.chunking.overlapSize,
      minChunkSize: config.rag.chunking.minChunkSize,
      preserveParagraphs: true,
      preserveSentences: true
    };
  }

  /**
   * Split a document into chunks
   */
  async chunkDocument(document: Document, options?: ChunkingOptions): Promise<DocumentChunk[]> {
    const opts = { ...this.defaultOptions, ...options };

    try {
      logger.debug('Chunking document', {
        documentId: document.id,
        contentLength: document.content.length,
        options: opts
      });

      if (document.content.length <= opts.maxChunkSize) {
        // Document is small enough, return as single chunk
        return [this.createSingleChunk(document, 0, 1)];
      }

      const chunks = this.splitTextIntoChunks(document.content, opts);
      const documentChunks = chunks.map((chunk, index) => 
        this.createDocumentChunk(document, chunk, index, chunks.length)
      );

      logger.debug('Successfully chunked document', {
        documentId: document.id,
        chunkCount: documentChunks.length,
        avgChunkSize: documentChunks.reduce((sum, chunk) => sum + chunk.content.length, 0) / documentChunks.length
      });

      return documentChunks;
    } catch (error) {
      logger.error('Error chunking document:', {
        error,
        documentId: document.id,
        contentLength: document.content.length
      });
      throw error;
    }
  }

  /**
   * Split text into overlapping chunks
   */
  private splitTextIntoChunks(text: string, options: Required<ChunkingOptions>): string[] {
    const chunks: string[] = [];
    
    // First try to split by paragraphs if preserveParagraphs is enabled
    if (options.preserveParagraphs) {
      const paragraphChunks = this.splitByParagraphs(text, options);
      if (paragraphChunks.length > 1) {
        return paragraphChunks;
      }
    }

    // If paragraph splitting doesn't work, try sentence splitting
    if (options.preserveSentences) {
      const sentenceChunks = this.splitBySentences(text, options);
      if (sentenceChunks.length > 1) {
        return sentenceChunks;
      }
    }

    // Fall back to character-based splitting
    return this.splitByCharacters(text, options);
  }

  /**
   * Split text by paragraphs while respecting chunk size limits
   */
  private splitByParagraphs(text: string, options: Required<ChunkingOptions>): string[] {
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    
    if (paragraphs.length <= 1) {
      return [text];
    }

    const chunks: string[] = [];
    let currentChunk = '';

    for (const paragraph of paragraphs) {
      const potentialChunk = currentChunk 
        ? `${currentChunk}\n\n${paragraph}`
        : paragraph;

      if (potentialChunk.length <= options.maxChunkSize) {
        currentChunk = potentialChunk;
      } else {
        // Current chunk is full, save it and start new one
        if (currentChunk.length >= options.minChunkSize) {
          chunks.push(currentChunk.trim());
        }

        // If single paragraph is too large, split it further
        if (paragraph.length > options.maxChunkSize) {
          const subChunks = this.splitBySentences(paragraph, options);
          chunks.push(...subChunks);
          currentChunk = '';
        } else {
          currentChunk = paragraph;
        }
      }
    }

    // Add remaining chunk
    if (currentChunk.length >= options.minChunkSize) {
      chunks.push(currentChunk.trim());
    }

    return this.addOverlap(chunks, options.overlapSize);
  }

  /**
   * Split text by sentences while respecting chunk size limits
   */
  private splitBySentences(text: string, options: Required<ChunkingOptions>): string[] {
    // Simple sentence splitting - can be improved with more sophisticated NLP
    const sentences = text
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0)
      .map(s => s + (text.match(/[.!?]/) || ['.'])[0]); // Add back punctuation

    if (sentences.length <= 1) {
      return [text];
    }

    const chunks: string[] = [];
    let currentChunk = '';

    for (const sentence of sentences) {
      const potentialChunk = currentChunk 
        ? `${currentChunk} ${sentence}`
        : sentence;

      if (potentialChunk.length <= options.maxChunkSize) {
        currentChunk = potentialChunk;
      } else {
        // Current chunk is full, save it and start new one
        if (currentChunk.length >= options.minChunkSize) {
          chunks.push(currentChunk.trim());
        }

        // If single sentence is too large, split by characters
        if (sentence.length > options.maxChunkSize) {
          const subChunks = this.splitByCharacters(sentence, options);
          chunks.push(...subChunks);
          currentChunk = '';
        } else {
          currentChunk = sentence;
        }
      }
    }

    // Add remaining chunk
    if (currentChunk.length >= options.minChunkSize) {
      chunks.push(currentChunk.trim());
    }

    return this.addOverlap(chunks, options.overlapSize);
  }

  /**
   * Split text by characters (fallback method)
   */
  private splitByCharacters(text: string, options: Required<ChunkingOptions>): string[] {
    const chunks: string[] = [];
    let startIndex = 0;

    while (startIndex < text.length) {
      let endIndex = Math.min(startIndex + options.maxChunkSize, text.length);

      // Try to break at a word boundary
      if (endIndex < text.length) {
        const lastSpaceIndex = text.lastIndexOf(' ', endIndex);
        if (lastSpaceIndex > startIndex) {
          endIndex = lastSpaceIndex;
        }
      }

      const chunk = text.slice(startIndex, endIndex).trim();
      
      if (chunk.length >= options.minChunkSize || startIndex + options.maxChunkSize >= text.length) {
        chunks.push(chunk);
      }

      startIndex = Math.max(endIndex - options.overlapSize, startIndex + 1);
    }

    return chunks;
  }

  /**
   * Add overlap between chunks
   */
  private addOverlap(chunks: string[], overlapSize: number): string[] {
    if (chunks.length <= 1 || overlapSize <= 0) {
      return chunks;
    }

    const overlappedChunks: string[] = [];

    for (let i = 0; i < chunks.length; i++) {
      let chunk = chunks[i];

      // Add overlap from previous chunk
      if (i > 0 && overlapSize > 0) {
        const prevChunk = chunks[i - 1];
        const overlapText = prevChunk.slice(-overlapSize);
        
        // Only add overlap if it doesn't duplicate content
        if (!chunk.startsWith(overlapText)) {
          chunk = `${overlapText} ${chunk}`;
        }
      }

      overlappedChunks.push(chunk);
    }

    return overlappedChunks;
  }

  /**
   * Create a single chunk for small documents
   */
  private createSingleChunk(document: Document, chunkIndex: number, totalChunks: number): DocumentChunk {
    return {
      id: `${document.id}_chunk_${chunkIndex}`,
      content: document.content,
      chunkIndex,
      totalChunks,
      metadata: { ...document.metadata },
      embedding: document.embedding
    };
  }

  /**
   * Create a document chunk from text
   */
  private createDocumentChunk(
    document: Document, 
    chunkText: string, 
    chunkIndex: number, 
    totalChunks: number
  ): DocumentChunk {
    return {
      id: `${document.id}_chunk_${chunkIndex}`,
      content: chunkText,
      chunkIndex,
      totalChunks,
      metadata: { ...document.metadata }
    };
  }

  /**
   * Merge chunks back into a document (useful for reconstruction)
   */
  async mergeChunks(chunks: DocumentChunk[]): Promise<Document> {
    if (chunks.length === 0) {
      throw new Error('Cannot merge empty chunks array');
    }

    // Sort chunks by index
    const sortedChunks = chunks.sort((a, b) => a.chunkIndex - b.chunkIndex);
    
    // Extract original document ID (remove chunk suffix)
    const originalId = sortedChunks[0].id.replace(/_chunk_\d+$/, '');
    
    // Merge content
    const mergedContent = sortedChunks
      .map(chunk => chunk.content)
      .join('\n\n');

    return {
      id: originalId,
      content: mergedContent,
      metadata: sortedChunks[0].metadata,
      chunks: sortedChunks
    };
  }

  /**
   * Validate chunking quality
   */
  validateChunks(chunks: DocumentChunk[]): { 
    isValid: boolean; 
    issues: string[]; 
    stats: {
      totalChunks: number;
      avgChunkSize: number;
      minChunkSize: number;
      maxChunkSize: number;
    };
  } {
    const issues: string[] = [];
    
    if (chunks.length === 0) {
      issues.push('No chunks provided');
      return { 
        isValid: false, 
        issues, 
        stats: { totalChunks: 0, avgChunkSize: 0, minChunkSize: 0, maxChunkSize: 0 }
      };
    }

    const chunkSizes = chunks.map(chunk => chunk.content.length);
    const totalChunks = chunks.length;
    const avgChunkSize = chunkSizes.reduce((sum, size) => sum + size, 0) / totalChunks;
    const minChunkSize = Math.min(...chunkSizes);
    const maxChunkSize = Math.max(...chunkSizes);

    // Check chunk size constraints
    if (minChunkSize < this.defaultOptions.minChunkSize) {
      issues.push(`Chunk too small: ${minChunkSize} < ${this.defaultOptions.minChunkSize}`);
    }

    if (maxChunkSize > this.defaultOptions.maxChunkSize) {
      issues.push(`Chunk too large: ${maxChunkSize} > ${this.defaultOptions.maxChunkSize}`);
    }

    // Check chunk indexing
    const expectedIndices = Array.from({ length: totalChunks }, (_, i) => i);
    const actualIndices = chunks.map(chunk => chunk.chunkIndex).sort((a, b) => a - b);
    
    if (JSON.stringify(expectedIndices) !== JSON.stringify(actualIndices)) {
      issues.push('Chunk indices are not sequential');
    }

    // Check total chunks consistency
    const inconsistentTotalChunks = chunks.some(chunk => chunk.totalChunks !== totalChunks);
    if (inconsistentTotalChunks) {
      issues.push('Inconsistent totalChunks across chunks');
    }

    return {
      isValid: issues.length === 0,
      issues,
      stats: { totalChunks, avgChunkSize, minChunkSize, maxChunkSize }
    };
  }

  /**
   * Get optimal chunk size for a given text
   */
  getOptimalChunkSize(text: string): number {
    const textLength = text.length;
    
    if (textLength <= this.defaultOptions.maxChunkSize) {
      return textLength;
    }

    // Calculate optimal chunk size to minimize padding
    const idealChunks = Math.ceil(textLength / this.defaultOptions.maxChunkSize);
    return Math.ceil(textLength / idealChunks);
  }
}

export default TextChunkingService; 