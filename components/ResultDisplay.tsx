import React, { useState, useEffect, useRef } from 'react';
import { Download, CheckCircle, FileText, ChevronDown, ChevronUp, Image as ImageIcon, Loader2, FileJson, Sparkles, Printer } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import { 
  Document, 
  Paragraph, 
  TextRun, 
  HeadingLevel, 
  Packer, 
  UnderlineType, 
  Table, 
  TableRow, 
  TableCell, 
  BorderStyle,
  WidthType,
  AlignmentType,
  ImageRun
} from 'docx';
import FileSaver from 'file-saver';
import { generateIllustration } from '../services/geminiService';
import { Subject, Textbook } from '../types';

interface ResultDisplayProps {
  result: string | null;
  loading: boolean;
  metaData?: {
    textbook: Textbook;
    subject: Subject;
    grade: number;
  };
}

// Custom component to handle dynamic image generation
const GeneratedImage = ({ src, alt, onImageLoaded }: { src: string, alt?: string, onImageLoaded?: (url: string, base64: string) => void }) => {
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const prompt = src.replace('generate:', '');

    useEffect(() => {
        let isMounted = true;
        const gen = async () => {
            const base64 = await generateIllustration(prompt);
            if (isMounted) {
                if (base64) {
                    setImageUrl(base64);
                    if (onImageLoaded) onImageLoaded(src, base64);
                } else {
                    setError(true);
                }
                setLoading(false);
            }
        };
        gen();
        return () => { isMounted = false; };
    }, [prompt, src, onImageLoaded]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded border border-dashed border-slate-300 my-4 w-full max-w-sm mx-auto">
                <Loader2 className="animate-spin text-slate-400 mb-2" size={20} />
                <p className="text-xs text-slate-500 font-serif italic">Đang vẽ minh họa...</p>
            </div>
        );
    }

    if (error || !imageUrl) {
         return (
            <div className="p-4 bg-slate-50 rounded border border-slate-200 my-4 text-center">
                <ImageIcon className="mx-auto text-slate-400 mb-2" size={24} />
                <p className="text-xs text-slate-500 italic">Không thể tạo hình ảnh</p>
            </div>
        );
    }

    return (
        <figure className="my-4 text-center">
            <img 
                src={imageUrl} 
                alt={alt} 
                className="rounded shadow-sm max-w-full md:max-w-md mx-auto border border-slate-200" 
            />
            {alt && <figcaption className="mt-1 text-sm text-slate-600 italic font-serif">{alt}</figcaption>}
        </figure>
    );
};

const ResultDisplay: React.FC<ResultDisplayProps> = ({ result, loading, metaData }) => {
  const [showPreview, setShowPreview] = useState(true);
  const [isGeneratingDoc, setIsGeneratingDoc] = useState(false);
  const [docProgress, setDocProgress] = useState(0);
  
  // Store generated images to use in DOCX export
  // Key: Original "generate:..." URL, Value: Base64 data
  const imageCacheRef = useRef<Record<string, string>>({});

  const handleImageLoaded = (src: string, base64: string) => {
      imageCacheRef.current[src] = base64;
  };

  // Helper: Tạo đối tượng Table cho docx từ mảng string Markdown table
  const createTableFromMarkdown = (tableLines: string[]): Table | null => {
    try {
        // Lọc bỏ dòng phân cách (---|---)
        const validLines = tableLines.filter(line => !line.match(/^\|?\s*[-:]+[-|\s:]*\|?\s*$/));
        
        const rows = validLines.map(line => {
            // Tách các cell dựa trên ký tự |, xử lý escape pipe nếu cần
            const cells = line.split('|');
            
            // Loại bỏ phần tử rỗng ở đầu/cuối do split nếu có pipe ở đầu/cuối dòng
            if (line.trim().startsWith('|')) cells.shift();
            if (line.trim().endsWith('|')) cells.pop();

            return new TableRow({
                children: cells.map(cellContent => new TableCell({
                    children: [new Paragraph({
                        children: parseTextWithFormatting(cellContent.trim())
                    })],
                    borders: {
                        top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                        bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                        left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                        right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                    },
                    width: {
                        size: 100 / cells.length,
                        type: WidthType.PERCENTAGE,
                    }
                }))
            });
        });

        return new Table({
            rows: rows,
            width: {
                size: 100,
                type: WidthType.PERCENTAGE,
            }
        });
    } catch (e) {
        console.error("Lỗi parse table:", e);
        return null;
    }
  };

  // Helper: Parse text with formatting
  const parseTextWithFormatting = (text: string): TextRun[] => {
    // Tokenizer đơn giản cho Bold, Italic, Underline.
    const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|<u>.*?<\/u>)/g);
    
    return parts.map(part => {
      // Bold
      if (part.startsWith('**') && part.endsWith('**')) {
        return new TextRun({
          text: part.slice(2, -2),
          bold: true
        });
      }
      
      // Italic (using * delimiter)
      if (part.startsWith('*') && part.endsWith('*') && part.length > 2) { 
        return new TextRun({
          text: part.slice(1, -1),
          italics: true
        });
      }

       // Italic (using _ delimiter)
       if (part.startsWith('_') && part.endsWith('_')) {
        return new TextRun({
          text: part.slice(1, -1),
          italics: true
        });
      }
      
      // Underline
      if (part.startsWith('<u>') && part.endsWith('</u>')) {
          const cleanText = part.replace(/<u>/g, '').replace(/<\/u>/g, '');
          return new TextRun({
              text: cleanText,
              underline: {
                  type: UnderlineType.SINGLE,
              }
          });
      }
      
      // Normal text
      return new TextRun({ text: part });
    });
  };

  const generateDocx = async () => {
    if (!result) return;
    setIsGeneratingDoc(true);
    setDocProgress(0);

    try {
      const lines = result.split('\n');
      const totalLines = lines.length;
      const children: (Paragraph | Table)[] = [];
      let tableBuffer: string[] = [];
      let inTable = false;

      for (let i = 0; i < lines.length; i++) {
        if (i % 5 === 0) {
            const currentProgress = Math.round((i / totalLines) * 90);
            setDocProgress(currentProgress);
            await new Promise(resolve => setTimeout(resolve, 0));
        }

        const line = lines[i].trimEnd(); 
        const trimmed = line.trim();

        // Image Handling
        const imageMatch = trimmed.match(/^!\[(.*?)\]\((.*?)\)$/);
        
        if (imageMatch) {
            const altText = imageMatch[1];
            const src = imageMatch[2];

            if (src.startsWith('generate:')) {
                let base64Data = imageCacheRef.current[src];
                if (!base64Data) {
                    const prompt = src.replace('generate:', '');
                    try {
                        const generated = await generateIllustration(prompt);
                        if (generated) base64Data = generated;
                    } catch (e) {
                        console.error("Failed to generate image for DOCX", e);
                    }
                }

                if (base64Data) {
                    const fetchResponse = await fetch(base64Data);
                    const blob = await fetchResponse.blob();
                    const arrayBuffer = await blob.arrayBuffer();

                    children.push(new Paragraph({
                        children: [
                            new ImageRun({
                                data: arrayBuffer,
                                transformation: { width: 400, height: 400 },
                            }),
                        ],
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 200, after: 100 }
                    }));
                    
                    if (altText) {
                         children.push(new Paragraph({
                            children: [new TextRun({ text: altText, italics: true, size: 20, color: "666666" })],
                            alignment: AlignmentType.CENTER,
                            spacing: { after: 200 }
                        }));
                    }
                    continue; 
                }
            }
        }

        // Detect Table Start/End
        if (trimmed.startsWith('|')) {
            inTable = true;
            tableBuffer.push(line);
            continue;
        } else if (inTable) {
            if (tableBuffer.length > 0) {
                const tableNode = createTableFromMarkdown(tableBuffer);
                if (tableNode) {
                    children.push(tableNode);
                    children.push(new Paragraph({ text: "" }));
                }
                tableBuffer = [];
            }
            inTable = false;
        }

        if (!trimmed) {
          children.push(new Paragraph({ text: "" }));
          continue;
        }

        // Handle Headings and Lists
        if (trimmed.startsWith('## ')) {
          children.push(new Paragraph({
            children: parseTextWithFormatting(trimmed.replace('## ', '')),
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 200, after: 100 }
          }));
        } else if (trimmed.startsWith('### ')) {
          children.push(new Paragraph({
             children: parseTextWithFormatting(trimmed.replace('### ', '')),
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 150, after: 50 }
          }));
        } else if (trimmed.startsWith('#### ')) {
            children.push(new Paragraph({
               children: parseTextWithFormatting(trimmed.replace('#### ', '')),
              heading: HeadingLevel.HEADING_3,
              spacing: { before: 100, after: 50 }
            }));
        } else if (trimmed.startsWith('- ') || trimmed.startsWith('+ ') || trimmed.startsWith('* ')) {
            children.push(new Paragraph({
                children: parseTextWithFormatting(trimmed.substring(2)),
                bullet: { level: 0 }
            }));
        } else {
             children.push(new Paragraph({
                children: parseTextWithFormatting(trimmed),
                spacing: { after: 100 },
                alignment: AlignmentType.JUSTIFIED
            }));
        }
      }

      if (tableBuffer.length > 0) {
         const tableNode = createTableFromMarkdown(tableBuffer);
         if (tableNode) children.push(tableNode);
      }

      setDocProgress(92);
      const doc = new Document({
        sections: [{ properties: {}, children: children }],
      });
      setDocProgress(95);
      const blob = await Packer.toBlob(doc);
      setDocProgress(98);
      FileSaver.saveAs(blob, "Ke_hoach_bai_day_NLS.docx");
      setDocProgress(100);

    } catch (error) {
      console.error("Lỗi tạo file docx:", error);
      alert("Lỗi khi tạo file DOCX. Đang tải về file TXT thay thế.");
      handleDownloadTxt();
    } finally {
      setTimeout(() => { setIsGeneratingDoc(false); setDocProgress(0); }, 800);
    }
  };

  const handleDownloadTxt = () => {
    if (!result) return;
    const blob = new Blob([result], { type: 'text/plain' });
    FileSaver.saveAs(blob, 'Ke_hoach_bai_day_NLS.txt');
  };

  const handleDownloadJson = () => {
    if (!result) return;
    const data = {
        metadata: metaData || {},
        content: result,
        generatedAt: new Date().toISOString(),
        version: "1.0"
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" });
    FileSaver.saveAs(blob, "Ke_hoach_bai_day_NLS.json");
  };

  if (loading) {
    return (
      <div className="bg-white p-12 rounded-xl shadow-sm border border-[var(--theme-border)] flex flex-col items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-[var(--theme-main)] mb-6"></div>
        <h3 className="text-lg font-semibold text-[var(--theme-dark)] animate-pulse">Đang xử lý...</h3>
        <p className="text-slate-500 mt-2 text-sm">Đang đối chiếu PPCT và tích hợp năng lực số.</p>
      </div>
    );
  }

  if (!result) return null;

  // Split content to find NLS section for special highlighting
  const nlsSectionRegex = /(##\s*MỤC TIÊU NĂNG LỰC SỐ[\s\S]*?)(?=\n##|\Z)/i;
  const parts = result.split(nlsSectionRegex);

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Action Bar */}
      <div className="bg-white rounded-xl shadow-lg border border-[var(--theme-border)] overflow-hidden">
        <div className="bg-[var(--theme-bg)] px-6 py-6 flex flex-col items-center justify-center text-center space-y-4">
            <div className="p-3 bg-white/50 rounded-full">
            <CheckCircle className="text-[var(--theme-main)]" size={32} />
            </div>
            <div>
                <h2 className="text-xl font-bold text-[var(--theme-dark)]">Đã soạn xong!</h2>
                <p className="text-slate-600 text-sm mt-1">
                    Đã tích hợp năng lực số vào giáo án. Xem trước bên dưới.
                </p>
            </div>
            
            <div className="flex flex-wrap gap-3 mt-4 justify-center w-full">
                <button 
                    onClick={generateDocx}
                    disabled={isGeneratingDoc}
                    className="flex items-center space-x-2 px-5 py-3 bg-gradient-to-r from-[var(--theme-gradient-from)] to-[var(--theme-gradient-to)] text-white rounded-lg font-bold shadow-md hover:shadow-lg transition-all active:scale-95"
                >
                    {isGeneratingDoc ? (
                        <>
                           <Loader2 className="animate-spin" size={20}/>
                           <span>{docProgress}%</span>
                        </>
                    ) : (
                        <>
                           <Download size={20} />
                           <span>Tải về .docx</span>
                        </>
                    )}
                </button>
                <button 
                    onClick={handleDownloadJson}
                    className="flex items-center space-x-2 px-4 py-3 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                >
                    <FileJson size={20} />
                    <span className="hidden sm:inline">JSON</span>
                </button>
            </div>
            
            <button 
                onClick={() => setShowPreview(!showPreview)}
                className="flex items-center text-[var(--theme-main)] text-sm font-medium hover:underline mt-2"
            >
                {showPreview ? <><ChevronUp size={16} className="mr-1" /> Thu gọn xem trước</> : <><ChevronDown size={16} className="mr-1" /> Xem kết quả</>}
            </button>
        </div>
      </div>

      {/* A4 Paper Preview */}
      {showPreview && (
        <div className="flex justify-center bg-slate-200/50 p-4 md:p-8 rounded-xl border border-slate-200 overflow-x-auto">
            {/* Styles for Word-like simulation */}
            <style>{`
                .docx-preview {
                    font-family: "Times New Roman", Times, serif;
                    font-size: 13pt; /* Slightly larger for screen reading, maps to 12-13pt */
                    line-height: 1.5;
                    color: #000;
                    text-align: justify;
                }
                .docx-preview h1 { font-size: 16pt; font-weight: bold; text-align: center; margin-top: 1em; margin-bottom: 0.5em; text-transform: uppercase; }
                .docx-preview h2 { font-size: 14pt; font-weight: bold; margin-top: 1em; margin-bottom: 0.5em; }
                .docx-preview h3 { font-size: 13pt; font-weight: bold; margin-top: 1em; margin-bottom: 0.5em; }
                .docx-preview p { margin-bottom: 0.5em; }
                .docx-preview strong { font-weight: bold; }
                .docx-preview em { font-style: italic; }
                .docx-preview ul { list-style-type: disc; padding-left: 1.5cm; margin-bottom: 0.5em; }
                .docx-preview ol { list-style-type: decimal; padding-left: 1.5cm; margin-bottom: 0.5em; }
                .docx-preview li { margin-bottom: 0.25em; }
                
                /* Table Styles mimicking Word's "Grid Table" */
                .docx-preview table { 
                    width: 100%; 
                    border-collapse: collapse; 
                    margin: 1em 0; 
                    font-size: 12pt;
                }
                .docx-preview th, .docx-preview td { 
                    border: 1px solid #000; 
                    padding: 6px 10px; 
                    vertical-align: top; 
                }
                .docx-preview th { 
                    font-weight: bold; 
                    background-color: transparent; /* Word tables usually transparent or light grey */
                    text-align: center;
                }
            `}</style>

            <div 
                className="docx-preview bg-white shadow-2xl mx-auto min-h-[29.7cm] w-[21cm] p-[2cm] box-border relative"
                style={{ maxWidth: '210mm' }} // Enforce A4 width on large screens
            >
                {/* Simulated Paper Header/Metadata */}
                <div className="absolute top-2 right-4 text-[10px] text-slate-300 font-sans select-none print:hidden">
                    A4 Preview Mode
                </div>

                {parts.map((part, index) => {
                    // Special rendering for NLS section to make it distinct but document-compatible
                    if (part.match(/##\s*MỤC TIÊU NĂNG LỰC SỐ/i)) {
                        return (
                            <div key={index} className="my-6 p-4 border-2 border-dashed border-[var(--theme-main)] bg-[var(--theme-bg)]/10 rounded-lg relative break-inside-avoid">
                                <div className="absolute -top-3 left-4 bg-white px-2 text-xs font-bold text-[var(--theme-main)] flex items-center border border-[var(--theme-main)] rounded">
                                    <Sparkles size={12} className="mr-1"/> NỘI DUNG TÍCH HỢP
                                </div>
                                <ReactMarkdown 
                                    rehypePlugins={[rehypeRaw]}
                                    remarkPlugins={[remarkGfm]}
                                    components={{
                                        img: ({src, alt}) => src?.startsWith('generate:') 
                                            ? <GeneratedImage src={src} alt={alt} onImageLoaded={handleImageLoaded} /> 
                                            : <img src={src} alt={alt} className="max-w-full h-auto mx-auto" />
                                    }}
                                >
                                    {part}
                                </ReactMarkdown>
                            </div>
                        );
                    }
                    
                    // Normal Content
                    return (
                        <div key={index}>
                            <ReactMarkdown 
                                rehypePlugins={[rehypeRaw]}
                                remarkPlugins={[remarkGfm]}
                                components={{
                                    img: ({src, alt}) => src?.startsWith('generate:') 
                                        ? <GeneratedImage src={src} alt={alt} onImageLoaded={handleImageLoaded} /> 
                                        : <img src={src} alt={alt} className="max-w-full h-auto mx-auto" />
                                }}
                            >
                                {part}
                            </ReactMarkdown>
                        </div>
                    );
                })}
            </div>
        </div>
      )}
    </div>
  );
};

export default ResultDisplay;