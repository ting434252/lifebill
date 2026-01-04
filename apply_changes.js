import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const INPUT_FILE = 'changes.xml';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function applyChanges() {
    const xmlPath = path.join(__dirname, INPUT_FILE);

    if (!fs.existsSync(xmlPath)) {
        console.error(`❌ 找不到 ${INPUT_FILE}，請確認檔案是否存在。`);
        return;
    }

    const xmlContent = fs.readFileSync(xmlPath, 'utf-8');
    
    // 改進的正則表達式：
    // 1. 先抓取每個 <change>...</change> 區塊
    // 2. 在區塊內分別尋找 <file> 和 <content>，不限制順序
    const changeBlocks = xmlContent.match(/<change>[\s\S]*?<\/change>/g);

    if (!changeBlocks) {
        console.log('⚠️  XML 裡找不到 <change> 區塊，請確認格式是否正確 (需包含 <changes> 包裹)。');
        return;
    }

    console.log(`🚀 偵測到 ${changeBlocks.length} 個變更，開始更新...`);

    let count = 0;

    changeBlocks.forEach((block) => {
        const fileMatch = block.match(/<file>(.*?)<\/file>/);
        // 支援 CDATA 的內容抓取
        const contentMatch = block.match(/<content><!\[CDATA\[([\s\S]*?)\]\]><\/content>/);

        if (!fileMatch || !contentMatch) {
            console.log('⚠️  略過格式錯誤的區塊 (缺少 file 或 content)');
            return;
        }

        const filePath = fileMatch[1].trim();
        const newContent = contentMatch[1]; // 保留原始縮排與換行
        const fullPath = path.join(__dirname, filePath);
        const dir = path.dirname(fullPath);

        // 確保資料夾存在
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        // 寫入檔案
        fs.writeFileSync(fullPath, newContent);
        console.log(`✅ 已更新: ${filePath}`);
        count++;
    });

    console.log(`🎉 完成！共更新了 ${count} 個檔案。`);
}

applyChanges();