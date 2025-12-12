import React, { useRef, useState } from 'react';
import { UploadCloud, Loader2, CheckCircle, FileText, FileUp, AlertCircle, X, AlertTriangle, ArrowDownCircle } from 'lucide-react';

interface ContentInputProps {
  lessonContent: string;
  setLessonContent: (val: string) => void;
  distributionContent: string;
  setDistributionContent: (val: string) => void;
}

// Khai báo thư viện ngoại
declare const mammoth: any;
declare const pdfjsLib: any;

const ContentInput: React.FC<ContentInputProps> = ({ 
  lessonContent, 
  setLessonContent,
  distributionContent,
  setDistributionContent
}) => {
  const lessonInputRef = useRef<HTMLInputElement>(null);
  const distInputRef = useRef<HTMLInputElement>(null);
  
  // Progress states (0-100)
  const [lessonProgress, setLessonProgress] = useState<number>(0);
  const [distProgress, setDistProgress] = useState<number>(0);
  
  const [lessonFileName, setLessonFileName] = useState<string | null>(null);
  const [distFileName, setDistFileName] = useState<string | null>(null);
  
  const [lessonFileSize, setLessonFileSize] = useState<string | null>(null);
  const [distFileSize, setDistFileSize] = useState<string | null>(null);

  // Local error states per input
  const [lessonError, setLessonError] = useState<string | null>(null);
  const [distError, setDistError] = useState<string | null>(null);

  // Drag states
  const [isLessonDragging, setIsLessonDragging] = useState(false);
  const [isDistDragging, setIsDistDragging] = useState(false);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const processFile = async (file: File, isLesson: boolean) => {
    const setProgress = isLesson ? setLessonProgress : setDistProgress;
    const setContent = isLesson ? setLessonContent : setDistributionContent;
    const setFileName = isLesson ? setLessonFileName : setDistFileName;
    const setFileSize = isLesson ? setLessonFileSize : setDistFileSize;
    const setError = isLesson ? setLessonError : setDistError;

    // Reset states
    setProgress(1); 
    setFileName(file.name);
    setFileSize(formatFileSize(file.size));
    setContent(''); 
    setError(null); // Clear previous errors
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      let text = "";

      if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
        text = await extractTextFromPDF(arrayBuffer, setProgress);
      } else if (
        file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || 
        file.name.endsWith(".docx")
      ) {
        setProgress(50);
        text = await extractTextFromDOCX(arrayBuffer);
        setProgress(100);
      } else {
        setError("Định dạng file không được hỗ trợ. Vui lòng chỉ chọn file .docx hoặc .pdf.");
        setFileName(null);
        setFileSize(null);
        setProgress(0);
        return;
      }

      if (!text.trim()) {
        setError("Không thể đọc được văn bản. Có thể đây là file PDF dạng ảnh scan? Vui lòng sử dụng file văn bản gốc.");
        setFileName(null);
        setFileSize(null);
        setProgress(0);
      } else {
        setContent(text);
        setProgress(100);
      }

    } catch (error) {
      console.error("Error processing file:", error);
      setError("Có lỗi xảy ra khi đọc file. File có thể bị hỏng hoặc có mật khẩu.");
      setFileName(null);
      setFileSize(null);
      setProgress(0);
    }
  };

  const extractTextFromDOCX = async (arrayBuffer: ArrayBuffer): Promise<string> => {
    if (typeof mammoth === 'undefined') return "";
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  };

  const extractTextFromPDF = async (arrayBuffer: ArrayBuffer, onProgress: (val: number) => void): Promise<string> => {
    if (typeof pdfjsLib === 'undefined') return "";
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = "";
    const totalPages = pdf.numPages;

    for (let i = 1; i <= totalPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(" ");
      fullText += pageText + "\n\n";
      
      // Update progress
      onProgress(Math.round((i / totalPages) * 100));
      
      // Yield to main thread
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    return fullText;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, isLesson: boolean) => {
    const file = e.target.files?.[0];
    if (file) processFile(file, isLesson);
    e.target.value = ''; 
  };

  const handleRemoveFile = (e: React.MouseEvent, isLesson: boolean) => {
    e.stopPropagation();
    if (isLesson) {
        setLessonContent('');
        setLessonFileName(null);
        setLessonFileSize(null);
        setLessonProgress(0);
        setLessonError(null);
    } else {
        setDistributionContent('');
        setDistFileName(null);
        setDistFileSize(null);
        setDistProgress(0);
        setDistError(null);
    }
  };

  // Drag and Drop Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e: React.DragEvent, isLesson: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    if (isLesson) setIsLessonDragging(true);
    else setIsDistDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent, isLesson: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    if (isLesson) setIsLessonDragging(false);
    else setIsDistDragging(false);
  };

  const handleDrop = (e: React.DragEvent, isLesson: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isLesson) setIsLessonDragging(false);
    else setIsDistDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      processFile(file, isLesson);
    }
  };


  // Component hiển thị ô upload
  const UploadBox = ({ 
    title, 
    subTitle, 
    inputRef, 
    fileName, 
    fileSize,
    progress, 
    isLesson,
    hasContent,
    error,
    isDragging,
    onDragEnter,
    onDragLeave,
    onDrop
  }: { 
    title: string, 
    subTitle: string, 
    inputRef: React.RefObject<HTMLInputElement | null>, 
    fileName: string | null, 
    fileSize: string | null,
    progress: number, 
    isLesson: boolean,
    hasContent: boolean,
    error: string | null,
    isDragging: boolean,
    onDragEnter: (e: React.DragEvent) => void,
    onDragLeave: (e: React.DragEvent) => void,
    onDrop: (e: React.DragEvent) => void
  }) => {
    const isProcessing = progress > 0 && progress < 100;

    return (
      <div className="flex flex-col h-full">
        <div 
            onClick={() => !isProcessing && inputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragEnter={onDragEnter}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            className={`relative border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center transition-all duration-200 h-48 active:scale-[0.98] flex-grow
            ${isDragging 
                ? 'border-[var(--theme-main)] bg-[var(--theme-bg)] scale-[1.02] shadow-xl ring-2 ring-[var(--theme-border)] ring-offset-2 z-10' 
                : ''}
            ${!isDragging && error ? 'border-red-300 bg-red-50' : ''}
            ${!isDragging && isProcessing ? 'border-[var(--theme-border)] bg-[var(--theme-bg)] cursor-wait' : ''}
            ${!isDragging && hasContent && !isProcessing && !error ? 'border-[var(--theme-main)] bg-[var(--theme-bg)] cursor-default' : ''}
            ${!isDragging && !hasContent && !isProcessing && !error ? 'border-[var(--theme-border)] bg-slate-50 hover:border-[var(--theme-main)] hover:bg-[var(--theme-bg)] cursor-pointer' : ''}
            `}
        >
            <input 
            type="file" 
            ref={inputRef}
            onChange={(e) => handleFileChange(e, isLesson)}
            accept=".pdf,.docx" 
            className="hidden" 
            disabled={isProcessing}
            />
            
            {isDragging ? (
                <div className="flex flex-col items-center animate-bounce-short">
                    <ArrowDownCircle className="text-[var(--theme-main)] mb-2" size={40} />
                    <p className="text-lg font-bold text-[var(--theme-dark)]">Thả file vào đây</p>
                </div>
            ) : isProcessing ? (
            <div className="flex flex-col items-center w-full px-4">
                <Loader2 className="text-[var(--theme-main)] animate-spin mb-3" size={32} />
                <p className="text-sm font-medium text-[var(--theme-dark)] mb-2">Đang xử lý... {progress}%</p>
                <div className="w-full bg-slate-200 rounded-full h-2">
                    <div 
                        className="bg-[var(--theme-main)] h-2 rounded-full transition-all duration-300 ease-out" 
                        style={{ width: `${progress}%` }}
                    ></div>
                </div>
            </div>
            ) : hasContent ? (
            <div className="flex flex-col items-center w-full relative">
                <button 
                    onClick={(e) => handleRemoveFile(e, isLesson)}
                    className="absolute -top-3 -right-3 p-1 bg-white text-slate-400 hover:text-red-500 rounded-full shadow-sm border border-slate-200 transition-colors z-20"
                    title="Xóa file"
                >
                    <X size={16} />
                </button>

                <div className="p-3 bg-white rounded-full shadow-sm mb-2">
                <CheckCircle className="text-[var(--theme-main)]" size={32} />
                </div>
                <p className="text-sm font-bold text-[var(--theme-dark)] break-all px-2 line-clamp-2">{fileName}</p>
                <p className="text-xs text-slate-500 mt-1">{fileSize}</p>
                <button 
                    onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
                    className="mt-3 text-xs text-[var(--theme-main)] font-medium hover:underline bg-white px-3 py-1 rounded-full border border-[var(--theme-border)]"
                >
                    Chọn file khác
                </button>
            </div>
            ) : (
            <div className="flex flex-col items-center py-2 pointer-events-none">
                <div className="p-3 bg-white rounded-full shadow-sm mb-3 group-hover:scale-110 transition-transform">
                {isLesson ? <FileText className="text-[var(--theme-main)]" size={28} /> : <FileUp className="text-[var(--theme-main)]" size={28} />}
                </div>
                <p className="text-base font-semibold text-slate-800">{title}</p>
                <p className="text-sm text-slate-500 mt-1">{subTitle}</p>
                
                {error && (
                    <div className="mt-3 text-xs text-red-600 bg-white px-2 py-1 rounded border border-red-200 flex items-center">
                        <AlertTriangle size={12} className="mr-1" />
                        {error}
                    </div>
                )}
                
                {!error && (
                    <div className="flex flex-col items-center mt-3">
                         <p className="text-xs text-[var(--theme-main)] bg-white px-2 py-1 rounded border border-[var(--theme-border)] mb-1">Hỗ trợ .docx, .pdf</p>
                         <p className="text-[10px] text-slate-400">Kéo thả hoặc nhấn để chọn</p>
                    </div>
                )}
            </div>
            )}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white p-5 md:p-6 rounded-xl shadow-sm border border-[var(--theme-border)] mb-6 transition-colors duration-300">
      <div className="flex items-center mb-6">
        <div className="h-8 w-1 bg-[var(--theme-main)] rounded-full mr-3"></div>
        <h2 className="text-lg font-semibold text-[var(--theme-dark)]">Tài liệu đầu vào</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Ô Upload Giáo án */}
        <div className="space-y-2 flex flex-col">
            <label className="block text-sm font-medium text-slate-700 flex items-center">
                <span className="text-red-500 mr-1">*</span> File Kế hoạch bài dạy
            </label>
            <UploadBox 
                title="Tải lên Kế hoạch bài dạy" 
                subTitle="Kế hoạch bài dạy cần tích hợp" 
                inputRef={lessonInputRef}
                fileName={lessonFileName}
                fileSize={lessonFileSize}
                progress={lessonProgress}
                isLesson={true}
                hasContent={!!lessonContent}
                error={lessonError}
                isDragging={isLessonDragging}
                onDragEnter={(e) => handleDragEnter(e, true)}
                onDragLeave={(e) => handleDragLeave(e, true)}
                onDrop={(e) => handleDrop(e, true)}
            />
             {!lessonContent && lessonProgress === 0 && !lessonError && (
                <p className="text-xs text-red-500 flex items-center mt-1">
                    <AlertCircle size={12} className="mr-1"/> Bắt buộc
                </p>
            )}
        </div>

        {/* Ô Upload PPCT */}
        <div className="space-y-2 flex flex-col">
            <label className="block text-sm font-medium text-slate-700">
                File Phân phối chương trình
            </label>
            <UploadBox 
                title="Tải lên PPCT" 
                subTitle="Tài liệu tham khảo năng lực (nếu có)" 
                inputRef={distInputRef}
                fileName={distFileName}
                fileSize={distFileSize}
                progress={distProgress}
                isLesson={false}
                hasContent={!!distributionContent}
                error={distError}
                isDragging={isDistDragging}
                onDragEnter={(e) => handleDragEnter(e, false)}
                onDragLeave={(e) => handleDragLeave(e, false)}
                onDrop={(e) => handleDrop(e, false)}
            />
            <p className="text-xs text-slate-500 mt-1">Tùy chọn. Giúp AI xác định năng lực chính xác hơn.</p>
        </div>
      </div>
    </div>
  );
};

export default ContentInput;