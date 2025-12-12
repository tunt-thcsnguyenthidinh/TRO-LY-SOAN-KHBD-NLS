import React from 'react';
import { BookOpen } from 'lucide-react';

const Header: React.FC = () => {
  return (
    <header className="bg-gradient-to-r from-[var(--theme-gradient-from)] to-[var(--theme-gradient-to)] text-white shadow-lg sticky top-0 z-50 relative overflow-hidden transition-colors duration-300">
      <div className="max-w-5xl mx-auto px-4 py-4 md:py-6 flex flex-col md:flex-row items-center justify-between gap-4 relative z-10">
        <div className="flex items-center space-x-3 w-full md:w-auto pr-0">
          <div className="bg-white p-1 rounded-full shrink-0 shadow-sm">
             <img 
                src="https://i.postimg.cc/BnGB9YN2/LOGO-NTD-2025-(1).png" 
                alt="Logo THCS Nguyễn Thị Định" 
                className="w-10 h-10 md:w-12 md:h-12 object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
             />
          </div>
          <div className="flex-1">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight leading-tight">TRỢ LÝ SOẠN KHBD TÍCH HỢP NLS</h1>
            <p className="text-white/90 text-xs md:text-sm mt-0.5 font-medium">Phần mềm hỗ trợ tích hợp Năng lực số vào KHBD từ Tiểu học đến THPT</p>
          </div>
        </div>
        
        {/* Footer info hidden on mobile, shown on desktop */}
        <div className="hidden md:flex items-center space-x-2 text-white/90 bg-black/10 px-4 py-2 rounded-full text-xs md:text-sm whitespace-nowrap">
          <BookOpen size={16} />
          <span>
            Phát triển bởi <a href="https://zalo.me/0798945678" target="_blank" rel="noopener noreferrer" className="font-semibold underline hover:text-white transition-colors">Nguyễn Thanh Tú</a>_0798945678
          </span>
        </div>
      </div>
    </header>
  );
};

export default Header;