import React, { useState, useMemo } from 'react';
import Header from './components/Header';
import LessonForm from './components/LessonForm';
import ContentInput from './components/ContentInput';
import ResultDisplay from './components/ResultDisplay';
import { Subject, Textbook } from './types';
import { generateNLSLessonPlan } from './services/geminiService';
import { Sparkles, Settings2, Palette } from 'lucide-react';

// Helper to adjust hex color brightness
const adjustColor = (color: string, amount: number) => {
    return '#' + color.replace(/^#/, '').replace(/../g, color => ('0' + Math.min(255, Math.max(0, parseInt(color, 16) + amount)).toString(16)).substr(-2));
}

// Preset Themes
const THEME_PRESETS = [
  { name: 'Hồng Pastel', color: '#f43f5e' }, // Rose 500
  { name: 'Cam Vũ Trụ', color: '#f97316' }, // Orange 500
  { name: 'Xanh Mint', color: '#10b981' }, // Emerald 500
  { name: 'Xanh Chuối', color: '#84cc16' }, // Lime 500
  { name: 'Đại Dương', color: '#0ea5e9' }, // Sky 500
  { name: 'Tím Mộng Mơ', color: '#8b5cf6' }, // Violet 500
  { name: 'Xám Tối Giản', color: '#64748b' }, // Slate 500
];

const App: React.FC = () => {
  // Theme State
  const [primaryColor, setPrimaryColor] = useState<string>('#f43f5e');

  // Calculate Derived Colors for CSS Variables
  const themeStyles = useMemo(() => {
    return {
      '--theme-main': primaryColor,
      '--theme-hover': adjustColor(primaryColor, -20), // Darker for hover
      '--theme-active': adjustColor(primaryColor, -40), // Darker for active
      '--theme-bg': adjustColor(primaryColor, 185), // Very light for backgrounds (approx 50/100 scale)
      '--theme-border': adjustColor(primaryColor, 130), // Light for borders (approx 200 scale)
      '--theme-dark': adjustColor(primaryColor, -80), // Dark for text (approx 900 scale)
      '--theme-gradient-from': adjustColor(primaryColor, 40), // Lighter for gradient start
      '--theme-gradient-to': primaryColor, // Gradient end
    } as React.CSSProperties;
  }, [primaryColor]);

  // State for Form
  const [textbook, setTextbook] = useState<Textbook>(Textbook.CTST);
  const [subject, setSubject] = useState<Subject>(Subject.TOAN);
  const [grade, setGrade] = useState<number>(7);
  
  // Content States
  const [lessonContent, setLessonContent] = useState<string>('');
  const [distributionContent, setDistributionContent] = useState<string>('');
  
  // State for Options
  const [analyzeOnly, setAnalyzeOnly] = useState(false);
  const [detailedReport, setDetailedReport] = useState(false);

  // App State
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleProcess = async () => {
    if (!lessonContent || lessonContent.trim().length === 0) {
      setError("Vui lòng tải lên file Kế hoạch bài dạy (File trống hoặc chưa được tải).");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Pass both contents to service
      const generatedText = await generateNLSLessonPlan(
        { 
            textbook, 
            subject, 
            grade, 
            content: lessonContent,
            distributionContent: distributionContent 
        },
        { analyzeOnly, detailedReport, comparisonExport: false }
      );

      if (!generatedText || generatedText.trim().length === 0) {
          throw new Error("AI trả về kết quả rỗng. Vui lòng thử lại với file Kế hoạch bài dạy rõ ràng hơn.");
      }

      setResult(generatedText);
    } catch (err: any) {
      console.error("Process Error:", err);
      setError(err.message || "Đã xảy ra lỗi không xác định khi kết nối với AI.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen font-sans pb-12 transition-colors duration-300"
      style={{
        backgroundColor: 'var(--theme-bg)',
        ...themeStyles
      }}
    >
      <Header />
      
      <main className="max-w-5xl mx-auto px-4 mt-6 md:mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Inputs */}
          <div className="lg:col-span-2 space-y-6">
            <LessonForm 
              textbook={textbook} setTextbook={setTextbook}
              subject={subject} setSubject={setSubject}
              grade={grade} setGrade={setGrade}
            />
            
            <ContentInput 
                lessonContent={lessonContent} 
                setLessonContent={setLessonContent}
                distributionContent={distributionContent}
                setDistributionContent={setDistributionContent}
            />
            
            {/* Options Panel */}
            <div className="bg-white p-5 md:p-6 rounded-xl shadow-sm border border-[var(--theme-border)]">
               <div className="flex items-center mb-4">
                <Settings2 className="text-[var(--theme-main)] mr-2" size={20} />
                <h3 className="font-semibold text-[var(--theme-dark)]">Tùy chọn nâng cao</h3>
              </div>
              
              <div className="space-y-4">
                {/* Checkboxes */}
                <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-6 pb-4 border-b border-slate-100">
                  <label className="flex items-center space-x-2 cursor-pointer touch-manipulation">
                    <input 
                      type="checkbox" 
                      checked={analyzeOnly}
                      onChange={(e) => setAnalyzeOnly(e.target.checked)}
                      className="w-5 h-5 text-[var(--theme-main)] rounded border-slate-300 focus:ring-[var(--theme-main)]" 
                    />
                    <span className="text-sm text-slate-700">Chỉ phân tích, không chỉnh sửa</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer touch-manipulation">
                    <input 
                      type="checkbox" 
                      checked={detailedReport}
                      onChange={(e) => setDetailedReport(e.target.checked)}
                      className="w-5 h-5 text-[var(--theme-main)] rounded border-slate-300 focus:ring-[var(--theme-main)]" 
                    />
                    <span className="text-sm text-slate-700">Kèm báo cáo chi tiết</span>
                  </label>
                </div>

                {/* Theme Selector */}
                <div>
                   <div className="flex items-center mb-3">
                      <Palette className="text-[var(--theme-main)] mr-2" size={18} />
                      <span className="text-sm font-medium text-slate-700">Giao diện ứng dụng</span>
                   </div>
                   <div className="flex flex-wrap gap-2 items-center">
                      {THEME_PRESETS.map((theme) => (
                        <button
                          key={theme.name}
                          onClick={() => setPrimaryColor(theme.color)}
                          className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${primaryColor === theme.color ? 'border-slate-600 scale-110 shadow-md' : 'border-transparent'}`}
                          style={{ backgroundColor: theme.color }}
                          title={theme.name}
                        />
                      ))}
                      
                      <div className="relative group ml-2 flex items-center bg-slate-100 rounded-full pl-2 pr-1 py-1 border border-slate-200">
                         <span className="text-xs text-slate-500 mr-2">Mã màu:</span>
                         <div className="relative w-6 h-6 rounded-full overflow-hidden border border-slate-300 shadow-sm cursor-pointer">
                            <input 
                              type="color" 
                              value={primaryColor}
                              onChange={(e) => setPrimaryColor(e.target.value)}
                              className="absolute -top-2 -left-2 w-10 h-10 p-0 m-0 cursor-pointer border-none bg-transparent"
                            />
                         </div>
                      </div>
                   </div>
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center text-sm md:text-base">
                <span className="font-medium mr-2">Lỗi:</span> {error}
              </div>
            )}
            
            <button
              onClick={handleProcess}
              disabled={loading}
              className={`w-full py-4 rounded-xl shadow-lg flex items-center justify-center space-x-2 text-white font-bold text-lg transition-all transform active:scale-95 hover:-translate-y-1 ${
                loading 
                  ? 'bg-slate-400 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-[var(--theme-gradient-from)] to-[var(--theme-gradient-to)] hover:shadow-lg'
              }`}
              style={!loading ? { boxShadow: '0 4px 14px 0 rgba(0,0,0,0.1)' } : {}}
            >
              {loading ? (
                <span>Đang xử lý...</span>
              ) : (
                <>
                  <Sparkles size={24} />
                  <span>BẮT ĐẦU SOẠN KẾ HOẠCH BÀI DẠY</span>
                </>
              )}
            </button>
          </div>

          {/* Right Column: Info - Hidden on very small screens if needed, but useful */}
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-[var(--theme-gradient-from)] to-[var(--theme-gradient-to)] text-white p-6 rounded-xl shadow-md transition-colors duration-300">
              <h3 className="font-bold text-lg mb-4">Hướng dẫn nhanh</h3>
              <ul className="space-y-3 text-white/90 text-sm">
                <li className="flex items-start">
                  <span className="bg-white/20 rounded-full w-5 h-5 flex items-center justify-center text-xs mr-2 mt-0.5 shrink-0">1</span>
                  <span>Chọn thông tin bộ sách, môn học và khối lớp.</span>
                </li>
                <li className="flex items-start">
                  <span className="bg-white/20 rounded-full w-5 h-5 flex items-center justify-center text-xs mr-2 mt-0.5 shrink-0">2</span>
                  <span><b>Bắt buộc:</b> Tải lên file Kế hoạch bài dạy (.docx hoặc .pdf).</span>
                </li>
                <li className="flex items-start">
                  <span className="bg-white/20 rounded-full w-5 h-5 flex items-center justify-center text-xs mr-2 mt-0.5 shrink-0">3</span>
                  <span><i>Tùy chọn:</i> Tải file PPCT nếu muốn AI tham khảo năng lực cụ thể của trường.</span>
                </li>
                <li className="flex items-start">
                  <span className="bg-white/20 rounded-full w-5 h-5 flex items-center justify-center text-xs mr-2 mt-0.5 shrink-0">4</span>
                  <a 
                    href="https://thuvienphapluat.vn/van-ban/Giao-duc/Thong-tu-02-2025-TT-BGDDT-quy-dinh-Khung-nang-luc-so-cho-nguoi-hoc-625668.aspx" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="underline hover:text-white transition-colors font-medium"
                  >
                    Chi tiết Khung Năng Lực Số
                  </a>
                </li>
              </ul>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-sm border border-[var(--theme-border)]">
              <h3 className="font-bold text-[var(--theme-dark)] mb-2">Miền năng lực số</h3>
              <div className="space-y-2">
                {[
                  "Khai thác dữ liệu và thông tin",
                  "Giao tiếp và Hợp tác",
                  "Sáng tạo nội dung số",
                  "An toàn số",
                  "Giải quyết vấn đề",
                  "Ứng dụng AI"
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center text-sm text-slate-600">
                    <div className="w-1.5 h-1.5 bg-[var(--theme-main)] rounded-full mr-2 shrink-0"></div>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Result Section */}
        <div className="mt-8">
           <ResultDisplay 
              result={result} 
              loading={loading} 
              metaData={{
                textbook,
                subject,
                grade
              }}
           />
        </div>
      </main>
      
      <footer className="mt-12 text-center text-slate-500 text-sm py-6 px-4">
        <p>© 2025 NguyenThanhTu. Built with Gemini 3PRO API & React.</p>
      </footer>
    </div>
  );
};

export default App;