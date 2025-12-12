import { GoogleGenAI } from "@google/genai";
import { LessonInfo, ProcessingOptions } from "../types";
import { SYSTEM_INSTRUCTION, NLS_FRAMEWORK_DATA } from "../constants";

export const generateNLSLessonPlan = async (
  info: LessonInfo,
  options: ProcessingOptions
): Promise<string> => {
  
  // Initialize inside function to avoid top-level execution issues
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("Lỗi Cấu Hình: Chưa thiết lập API Key. Vui lòng kiểm tra biến môi trường.");
  }
  
  const ai = new GoogleGenAI({ apiKey: apiKey });
  const modelId = "gemini-2.5-flash"; 
  
  let distributionContext = "";
  if (info.distributionContent && info.distributionContent.trim().length > 0) {
      distributionContext = `
      =========================================================
      🚨 QUY TẮC TỐI THƯỢNG (KHI CÓ PPCT - STRICT MODE):
      Người dùng ĐÃ CUNG CẤP nội dung Phân phối chương trình (PPCT).
      Đây là văn bản pháp quy, bạn phải tuân thủ TUYỆT ĐỐI các yêu cầu sau:

      1. Đọc tên bài học trong "NỘI DUNG KẾ HOẠCH BÀI DẠY GỐC".
      2. Tìm bài học tương ứng trong nội dung PPCT.
      3. Trích xuất NGUYÊN VĂN, CHÍNH XÁC nội dung cột "Năng lực số" (hoặc YCCĐ năng lực số) của bài học đó.
      4. Đưa nội dung trích xuất đó vào phần Mục tiêu Năng lực số.
      
      ⛔️ CÁC ĐIỀU CẤM (STRICTLY PROHIBITED):
      - CẤM TUYỆT ĐỐI việc tự ý thêm bất kỳ năng lực số nào khác không có trong PPCT của bài học này.
      - CẤM tự ý nâng cao hay thay đổi cấp độ nếu PPCT không yêu cầu.
      - CẤM dùng Khung năng lực số tham chiếu để bịa thêm mục tiêu. CHỈ dùng những gì PPCT ghi.
      - Nếu cột năng lực số trong PPCT để trống, thì mục tiêu NLS ghi là: "Không có (theo PPCT)".

      Đánh dấu mục tiêu này bằng dòng chữ: "(Nội dung trích xuất nguyên văn từ PPCT)".

      NỘI DUNG PPCT:
      ${info.distributionContent}
      =========================================================
      `;
  }

  const userPrompt = `
    DỮ LIỆU THAM CHIẾU KHUNG NĂNG LỰC SỐ (Chỉ sử dụng khi KHÔNG CÓ file PPCT hoặc để hiểu rõ mã năng lực trong PPCT):
    ${NLS_FRAMEWORK_DATA}

    THÔNG TIN KẾ HOẠCH BÀI DẠY ĐẦU VÀO:
    - Bộ sách: ${info.textbook}
    - Môn học: ${info.subject}
    - Khối lớp: ${info.grade}
    
    ${distributionContext}

    YÊU CẦU XỬ LÝ NỘI DUNG:
    ${options.analyzeOnly ? "- Chỉ phân tích, không chỉnh sửa chi tiết." : "- Chỉnh sửa Kế hoạch bài dạy và TÍCH HỢP NĂNG LỰC SỐ vào các hoạt động dạy học."}
    ${options.detailedReport ? `
    - BẮT BUỘC: Ở cuối văn bản, hãy tạo một mục riêng biệt có tiêu đề "### PHỤ LỤC: GIẢI MÃ NĂNG LỰC SỐ".
    - Trình bày dưới dạng bảng gồm 3 cột: 
      | Mã NLS | Tên năng lực | Mô tả & Giải thích lý do chọn |
    - Liệt kê và giải thích ngắn gọn tất cả các mã NLS đã sử dụng trong bài.` : ""}
    
    YÊU CẦU VỀ ĐỊNH DẠNG (BẮT BUỘC):
    1. GIỮ NGUYÊN ĐỊNH DẠNG GỐC: Bạn phải giữ nguyên các đoạn in đậm (**text**), in nghiêng (*text*) của văn bản gốc. Không được làm mất định dạng này.
    2. TOÁN HỌC: Tất cả công thức toán phải viết dạng LaTeX trong dấu $. Ví dụ: $x^2$. Không dùng unicode.
    3. BẢNG: Sử dụng Markdown Table chuẩn.
    4. NLS BỔ SUNG: Dùng thẻ <u>...</u> để gạch chân nội dung bạn thêm vào.
    
    LƯU Ý VỀ TÍCH HỢP HOẠT ĐỘNG (KHI CÓ PPCT):
    - Các hoạt động dạy học (trong phần Tiến trình) cũng chỉ được thiết kế xoay quanh các năng lực số đã trích xuất từ PPCT. Không thiết kế hoạt động cho các năng lực nằm ngoài PPCT.
    
    ĐỊNH DẠNG ĐẦU RA:
    - Trả về toàn bộ nội dung Kế hoạch bài dạy đã chỉnh sửa dưới dạng Markdown.
    
    NỘI DUNG KẾ HOẠCH BÀI DẠY GỐC:
    ${info.content}
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.2, 
      },
      contents: userPrompt,
    });

    const text = response.text;
    if (!text) {
        throw new Error("AI trả về kết quả rỗng. Vui lòng thử lại.");
    }
    return text;

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    
    // Friendly Error Mapping
    let friendlyMessage = "Đã xảy ra lỗi khi kết nối với hệ thống AI.";
    let action = "Vui lòng thử lại sau giây lát.";

    if (error.message) {
        if (error.message.includes("429")) {
            friendlyMessage = "Hệ thống đang quá tải (Lỗi 429).";
            action = "Vui lòng đợi khoảng 1 phút rồi thử lại.";
        } else if (error.message.includes("400")) {
            friendlyMessage = "Yêu cầu không hợp lệ (Lỗi 400).";
            action = "Nội dung file có thể quá dài hoặc chứa ký tự lạ. Hãy thử cắt ngắn bớt.";
        } else if (error.message.includes("API key")) {
            friendlyMessage = "Lỗi xác thực API Key.";
            action = "Vui lòng kiểm tra lại cấu hình API Key của hệ thống.";
        } else if (error.message.includes("SAFETY")) {
             friendlyMessage = "Nội dung bị chặn bởi bộ lọc an toàn.";
             action = "Vui lòng kiểm tra xem tài liệu có chứa nội dung nhạy cảm không.";
        } else if (error.message.includes("fetch")) {
            friendlyMessage = "Lỗi kết nối mạng.";
            action = "Vui lòng kiểm tra đường truyền internet của bạn.";
        }
    }

    throw new Error(`${friendlyMessage} ${action}`);
  }
};

export const generateIllustration = async (prompt: string): Promise<string | null> => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) return null;
    const ai = new GoogleGenAI({ apiKey });
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [{ text: prompt }] },
        });

        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            }
        }
    } catch (e) {
        console.error("Image Gen Error:", e);
        // Fail silently for images as they are optional
    }
    return null;
}