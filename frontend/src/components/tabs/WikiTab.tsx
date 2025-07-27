import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeftIcon, DocumentTextIcon, BookOpenIcon } from '@heroicons/react/24/outline';
import { documentationService, DocumentationSection, DocumentationItem } from '@/services/documentation';

export const WikiTab: React.FC = () => {
  const [sections, setSections] = useState<DocumentationSection[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<DocumentationItem | null>(null);
  const [documentContent, setDocumentContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [contentLoading, setContentLoading] = useState(false);

  useEffect(() => {
    loadDocumentationSections();
  }, []);

  useEffect(() => {
    if (selectedDocument) {
      loadDocumentContent(selectedDocument.path);
    }
  }, [selectedDocument]);

  const loadDocumentationSections = async () => {
    try {
      setLoading(true);
      const sectionsData = await documentationService.getDocumentationSections();
      setSections(sectionsData);
    } catch (error) {
      console.error('Error loading documentation sections:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDocumentContent = async (path: string) => {
    try {
      setContentLoading(true);
      const content = await documentationService.getDocumentationContent(path);
      setDocumentContent(content);
    } catch (error) {
      console.error('Error loading document content:', error);
      setDocumentContent('Error loading document content');
    } finally {
      setContentLoading(false);
    }
  };

  const handleDocumentClick = (document: DocumentationItem) => {
    setSelectedDocument(document);
  };

  const handleBackClick = () => {
    setSelectedDocument(null);
    setDocumentContent('');
  };

  const renderMarkdownContent = (content: string) => {
    // Simple markdown rendering - you might want to use a proper markdown library
    const lines = content.split('\n');
    return (
      <div className="prose prose-sm max-w-none">
        {lines.map((line, index) => {
          if (line.startsWith('# ')) {
            return <h1 key={index} className="text-2xl font-bold mb-4">{line.substring(2)}</h1>;
          } else if (line.startsWith('## ')) {
            return <h2 key={index} className="text-xl font-bold mb-3">{line.substring(3)}</h2>;
          } else if (line.startsWith('### ')) {
            return <h3 key={index} className="text-lg font-bold mb-2">{line.substring(4)}</h3>;
          } else if (line.startsWith('**') && line.endsWith('**')) {
            return <p key={index} className="font-bold mb-2">{line.substring(2, line.length - 2)}</p>;
          } else if (line.startsWith('```')) {
            return <pre key={index} className="bg-gray-100 p-4 rounded-lg overflow-x-auto my-4"><code>{line.substring(3)}</code></pre>;
          } else if (line.trim() === '') {
            return <br key={index} />;
          } else {
            return <p key={index} className="mb-2">{line}</p>;
          }
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-800 text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading documentation...</p>
        </div>
      </div>
    );
  }

  if (selectedDocument) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="h-full flex flex-col bg-gray-800 text-white"
      >
        {/* Header */}
        <div className="bg-gray-700 border-b border-gray-600 p-6">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleBackClick}
              className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors"
            >
              <ChevronLeftIcon className="w-5 h-5" />
              <span>Back to Documentation</span>
            </button>
          </div>
          <div className="mt-4">
            <h1 className="text-2xl font-bold text-white">{selectedDocument.title}</h1>
            <p className="text-gray-300 mt-2">{selectedDocument.description}</p>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {contentLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-gray-300">Loading content...</p>
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto">
              <div className="bg-gray-700 rounded-xl p-8 border border-gray-600">
                {renderMarkdownContent(documentContent)}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-full flex flex-col bg-gray-800 text-white"
    >
      {/* Header */}
      <div className="bg-gray-700 border-b border-gray-600 p-8 text-center">
        <h1 className="text-4xl font-bold text-white mb-4">
          Documentation Center
        </h1>
        <p className="text-xl text-gray-300 max-w-2xl mx-auto">
          Explore comprehensive documentation for the Interactor system, including guides, API references, and module documentation.
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid gap-8">
            {sections.map((section, sectionIndex) => (
              <motion.div
                key={section.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: sectionIndex * 0.1 }}
              >
                <h2 className="text-2xl font-bold text-white mb-6 text-center">
                  {section.title}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {section.items.map((item, itemIndex) => (
                    <motion.div
                      key={item.title}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: (sectionIndex * 0.1) + (itemIndex * 0.05) }}
                      whileHover={{ scale: 1.02, y: -4 }}
                      className="group cursor-pointer"
                      onClick={() => handleDocumentClick(item)}
                    >
                      <div className="bg-gray-700 rounded-xl p-6 border border-gray-600 hover:border-gray-500 transition-all duration-300 shadow-lg hover:shadow-xl">
                        <div className="flex items-center space-x-4 mb-4">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                            {item.type === 'markdown' ? (
                              <DocumentTextIcon className="w-6 h-6 text-white" />
                            ) : (
                              <BookOpenIcon className="w-6 h-6 text-white" />
                            )}
                          </div>
                          <div className="flex-1">
                            <h3 className="text-lg font-bold text-white group-hover:text-blue-300 transition-colors">
                              {item.title}
                            </h3>
                                                         <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                               item.type === 'markdown' 
                                 ? 'bg-blue-900/30 text-blue-300' 
                                 : 'bg-purple-900/30 text-purple-300'
                             }`}>
                               {item.type === 'markdown' ? 'Documentation' : 'Wiki'}
                             </span>
                          </div>
                        </div>
                        <p className="text-gray-300 text-sm leading-relaxed">
                          {item.description}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-16 text-center"
          >
            <div className="bg-gray-700 rounded-xl p-8 border border-gray-600 max-w-2xl mx-auto">
              <h3 className="text-xl font-bold text-white mb-4">Need Help?</h3>
              <p className="text-gray-300 mb-6">
                Can't find what you're looking for? Check out our comprehensive documentation or reach out to our support team.
              </p>
              <div className="flex justify-center space-x-4">
                <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  Contact Support
                </button>
                <button className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-colors">
                  View All Docs
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}; 