import React, { useState, useEffect } from 'react';
import mammoth from 'mammoth';
import { ColorFormattingCode, SpecialFormattingCode } from '../../common/formatting';
import styles from './BookFromDoc.module.scss';
import { Converter } from 'showdown';
import { debounce } from 'lodash';
import JSZip from 'jszip';
import Advertisement from '../components/Advertisement/Advertisement';

const PAGES_PER_BOOK = 100;

export const BookFromDoc = () => {
    const [stendhalContent, setStendhalContent] = useState('');
    const [intermediateHtml, setIntermediateHtml] = useState('');
    const [title, setTitle] = useState('');
    const [author, setAuthor] = useState('');
    const [maxChars, setMaxChars] = useState(220);
    const [pageCount, setPageCount] = useState(0);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setPageCount(stendhalContent.split('#- ').length - 1);
    }, [stendhalContent]);

    const booksRequired = Math.ceil(pageCount / PAGES_PER_BOOK);

    useEffect(() => {
        if (stendhalContent) {
            const updatedContent = stendhalContent.replaceAll(/title: .*\nauthor: .*\npages:/g, `title: ${title}\nauthor: ${author}\npages:`);
            setStendhalContent(updatedContent);
        }
    }, [title, author]);

    useEffect(() => {
        if (intermediateHtml) {
            debounceUpdateStendhalContent();
        }
    }, [maxChars]);

    const debounceUpdateStendhalContent = debounce(() => {
        const stendhalFormatted = convertHtmlToStendhal(intermediateHtml);
        setStendhalContent(stendhalFormatted);
    }, 100);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setLoading(true);
            const reader = new FileReader();
            reader.onload = async (e) => {
                if (e.target?.result) {
                    let stendhalFormatted = '';
                    if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
                        const content = Buffer.isBuffer(e.target?.result) ? e.target?.result : Buffer.from(e.target?.result as ArrayBuffer);
                        const result = await mammoth.convertToHtml({ arrayBuffer: content });
                        stendhalFormatted = convertHtmlToStendhal(result.value);
                        setIntermediateHtml(result.value);
                    } else {
                        const content = e.target?.result;
                        const result = (new Converter()).makeHtml(content as string);
                        stendhalFormatted = convertHtmlToStendhal(result.toString());
                        setIntermediateHtml(result.toString());
                    }
                    if (!title) {
                        setTitle(file.name.replace(/\.[^/.]+$/, ""));
                    }
                    if (!author) {
                        const extractedAuthor = extractAuthor(stendhalFormatted);
                        setAuthor(extractedAuthor || "Anonymous");
                    }
                    setStendhalContent(stendhalFormatted);
                    setLoading(false);
                }
            };
            if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
                reader.readAsArrayBuffer(file);
            } else {
                reader.readAsText(file);
            }
        }
    };

    const extractAuthor = (text: string): string | null => {
        const authorMatch = text.match(/^(?:By|Written By)\s+([^\n]+)/im);
        return authorMatch ? authorMatch[1].trim() : null;
    };

    const convertHtmlToStendhal = (html: string): string => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        let stendhalText = '';

        const walk = (node: Node) => {
            if (node.nodeType === Node.TEXT_NODE) {
                stendhalText += node.textContent;
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                const element = node as HTMLElement;
                switch (element.tagName.toLowerCase()) {
                    case 'b':
                    case 'strong':
                        stendhalText += SpecialFormattingCode.bold.code;
                        break;
                    case 'i':
                    case 'em':
                        stendhalText += SpecialFormattingCode.italic.code;
                        break;
                    case 'u':
                        stendhalText += SpecialFormattingCode.underline.code;
                        break;
                    case 'strike':
                    case 's':
                        stendhalText += SpecialFormattingCode.strikethrough.code;
                        break;
                    case 'span':
                        const color = element.style.color;
                        if (color) {
                            const colorCode = ColorFormattingCode.nearestFormattingCode(color);
                            stendhalText += colorCode.formatCode;
                        }
                        break;
                    case 'br':
                        stendhalText += '\n';
                        break;
                    case 'p':
                        stendhalText += '\n\n';
                        break;
                    case 'ol':
                        stendhalText += '\n';
                        break;
                    case 'li':
                        stendhalText += '\n- ';
                        break;
                    case 'h1':
                        stendhalText += '\n\n#- ' + SpecialFormattingCode.bold.code;
                        break;
                    case 'h2':
                        stendhalText += '\n\n#- ' + SpecialFormattingCode.bold.code;
                        break;
                    case 'h3':
                        stendhalText += '\n\n#- ' + SpecialFormattingCode.bold.code;
                        break;
                    default:
                        break;
                }
                element.childNodes.forEach(walk);
                if (['h1', 'h2', 'h3', 'b', 'strong', 'i', 'em', 'u', 'strike', 's', 'span', 'li'].includes(element.tagName.toLowerCase())) {
                    stendhalText += SpecialFormattingCode.reset.code;
                }
            }
        };

        doc.body.childNodes.forEach(walk);
        return addPageBreaks(stendhalText);
    };

    const convertToStendhal = (text: string): string => {
        return addPageBreaks(text);
    };

    const addPageBreaks = (text: string): string => {
        const size = maxChars; // Page size in characters
        let pages: string[] = [];
        let currentPage = '';

        const addPage = () => {
            if (currentPage.trim().length > 0) {
                pages.push("#- " + currentPage.trim());
                currentPage = '';
            }
        };

        const words = text.split(' ');
        for (let i = 0; i < words.length; i++) {
            if (currentPage.length + words[i].length + 1 > size) {
                addPage();
            }
            currentPage += words[i] + ' ';
        }
        addPage();

        let mergedPages: string[] = [];
        let buffer = '';
        for (let i = 0; i < pages.length; i++) {
            if (buffer.length + pages[i].length <= size) {
                buffer += pages[i].replace('#- ', '') + ' ';
            } else {
                mergedPages.push("#- " + buffer.trim());
                buffer = pages[i].replace('#- ', '');
            }
        }
        if (buffer.length > 0) {
            mergedPages.push("#- " + buffer.trim());
        }

        let finalText = mergedPages.join("\n").replace(/#- \n+/g, '#- ');

        // Remove successive page breaks with only whitespace in between
        finalText = finalText.replace(/(#- \s*){2,}/g, '#- ');

        // Regex to check for subheadings split across pages
        const subheadingSplitRegex = /#- §l([^§]+)\s*#-(.*)§r/g;
        finalText = finalText.replace(subheadingSplitRegex, (match, p1, p2) => `#- §l${p1.replace('\n', '')}${p2.replace('\n', '')}§r`);

        const totalPages = finalText.split('#- ').length - 1;
        if (totalPages > PAGES_PER_BOOK) {
            const books = splitIntoBooks(finalText, Math.ceil(totalPages / PAGES_PER_BOOK));
            return books.map((book, index) => `title: ${title} ${index + 1}\nauthor: ${author}\npages:\n${book}`).join('\n\n');
        }

        return `title: ${title}\nauthor: ${author}\npages:\n${finalText}`;
    };

    const splitIntoBooks = (text: string, numberOfBooks: number): string[] => {
        const sections = text.split('\n\n#- ');
        const books: string[] = [];
        const sectionsPerBook = Math.ceil(sections.length / numberOfBooks);

        for (let i = 0; i < numberOfBooks; i++) {
            const start = i * sectionsPerBook;
            const end = start + sectionsPerBook;
            books.push(sections.slice(start, end).join('\n\n#- '));
        }

        return books;
    };

    const handleDownload = async () => {
        const books = stendhalContent.split(/title: .*\nauthor: .*\npages:/g).filter(chunk => chunk.trim()).map((chunk, index) => {
            const blob = new Blob([`title: ${title} ${index + 1}\nauthor: ${author}\npages:\n${chunk.trim()}`], { type: 'text/plain' });
            return { blob, name: `${title} ${index + 1}.stendhal` };
        });

        if (books.length > 1) {
            const zip = new JSZip();
            books.forEach(book => {
                zip.file(book.name, book.blob);
            });
            const zipBlob = await zip.generateAsync({ type: 'blob' });
            const url = URL.createObjectURL(zipBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${title}.zip`;
            a.click();
            URL.revokeObjectURL(url);
        } else if (books.length === 1) {
            const url = URL.createObjectURL(books[0].blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = books[0].name;
            a.click();
            URL.revokeObjectURL(url);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(stendhalContent);
        alert('Stendhal content copied to clipboard!');
    };

    return (
        <div className={styles.container}>
            <h1>Stendhal Book Converter</h1>
            <p>
                This tool allows you to convert .docx or .md files into the Stendhal book format. 
                Simply upload your file, and the tool will process it into a format suitable for Stendhal books.
                You can adjust the title, author, and the maximum number of characters per page.
                For more information about Stendhal, visit <a href="https://modrinth.com/mod/stendhal" target="_blank" rel="noopener noreferrer">Stendhal on Modrinth</a>.
            </p>
            <p>
                Instructions:
                <ol>
                    <li>Upload a .docx or .md file using the file input below.</li>
                    <li>Adjust the title and author fields as needed.</li>
                    <li>Set the maximum number of characters per page using the slider or number input.</li>
                    <li>Once the file is processed, you can download the Stendhal formatted content or copy it to the clipboard.</li>
                </ol>
            </p>
            <div>
                <label>
                    Title:
                    <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} />
                </label>
            </div>
            <div>
                <label>
                    Author:
                    <input type="text" value={author} onChange={(e) => setAuthor(e.target.value)} />
                </label>
            </div>
            <div>
                <label>
                    Max Characters per Page:
                    <input
                        type="range"
                        min="10"
                        max="250"
                        value={maxChars}
                        onChange={(e) => setMaxChars(parseInt(e.target.value))}
                    />
                    <input
                        type="number"
                        min="10"
                        max="250"
                        value={maxChars}
                        onChange={(e) => setMaxChars(parseInt(e.target.value))}
                    />
                </label>
            </div>
            <div>
                <input type="file" accept=".docx,.md" onChange={handleFileChange} />
            </div>
            {loading && (
                <div className="text-center mt-3" id="loading-spinner">
                    <div className="spinner-border" role="status">
                        <span className="sr-only">Loading...</span>
                    </div>
                </div>
            )}
            {!loading && stendhalContent && (
                <>
                    <textarea value={stendhalContent} readOnly rows={20} cols={80} />
                    <div className={styles.instructions}>
                        <p>
                            The text area above shows the Stendhal formatted content. Page breaks are indicated by the "#- " marker.
                            Each page starts with this marker, followed by the content of that page.
                        </p>
                    </div>
                    <div className={styles.statistics}>
                        <p>Pages Generated: {pageCount}</p>
                        <p>Books Required: {booksRequired}</p>
                    </div>
                    <div className={styles.actions + " text-center mt-3"}>
                        <button className="btn btn-primary" onClick={handleDownload}>
                            <i className="fas fa-book"></i> {stendhalContent.split(/title: .*\nauthor: .*\npages:/g).length > 2 ? 'Download all books as .zip' : 'Download as .stendhal'}
                        </button>
                        <button className="btn btn-secondary ml-2" onClick={handleCopy}>
                            <i className="fas fa-copy"></i> Copy to Clipboard
                        </button>
                    </div>
                </>
            )}
            <Advertisement />
        </div>
    );
};

export default BookFromDoc;