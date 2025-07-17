import React, { useState, useRef, useEffect, useId } from 'react';
import styles from './Contact.module.css';
import Navbar from './Navbar';
import Footer from './Footer';
import { CONTACT_ENDPOINT } from '../utils/api';
import { IoClose } from 'react-icons/io5';

interface ContactFormData {
  name: string;
  inquiry: string;
  email: string;
  message: string;
  attachedFiles: FileList | null;
}

const Contact: React.FC = () => {
  const [formData, setFormData] = useState<ContactFormData>({
    name: '',
    inquiry: 'general',
    email: '',
    message: '',
    attachedFiles: null
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [isScrolled, setIsScrolled] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Generate unique IDs for accessibility
  const nameId = useId();
  const inquiryId = useId();
  const emailId = useId();
  const messageId = useId();
  const attachmentsId = useId();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = e.target.files;
    
    // If no files selected (user canceled), preserve existing files
    if (!newFiles || newFiles.length === 0) {
      return;
    }

    // Get existing files
    const existingFiles = formData.attachedFiles ? Array.from(formData.attachedFiles) : [];
    
    // Combine existing and new files
    const allFiles = [...existingFiles];
    const newFilesArray = Array.from(newFiles);
    
    // Check for duplicates and add only new files
    newFilesArray.forEach(newFile => {
      const isDuplicate = existingFiles.some(existingFile => 
        existingFile.name === newFile.name && 
        existingFile.size === newFile.size &&
        existingFile.lastModified === newFile.lastModified
      );
      
      if (!isDuplicate) {
        allFiles.push(newFile);
      }
    });

    // Validate total file count
    if (allFiles.length > 5) {
      setErrorMessage(`Cannot add ${newFilesArray.length} file(s). Maximum 5 files allowed. You currently have ${existingFiles.length} file(s) selected.`);
      setSubmitStatus('error');
      // Clear the input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    // Validate new files only
    const maxFileSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/gif'
    ];

    const errors: string[] = [];
    newFilesArray.forEach((file) => {
      if (file.size > maxFileSize) {
        errors.push(`File "${file.name}" is too large. Maximum size is 10MB.`);
      }
      if (!allowedTypes.includes(file.type)) {
        errors.push(`File "${file.name}" has unsupported file type.`);
      }
    });

    if (errors.length > 0) {
      setErrorMessage(errors.join(' '));
      setSubmitStatus('error');
      // Clear the input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    // Clear any previous errors
    setErrorMessage('');
    setSubmitStatus('idle');

    // Create a new FileList with all files
    const dt = new DataTransfer();
    allFiles.forEach(file => {
      dt.items.add(file);
    });

    // Update both the form state and the input
    setFormData(prev => ({
      ...prev,
      attachedFiles: dt.files
    }));

    // Clear the input value to allow selecting more files
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');
    setErrorMessage('');

    try {
      let requestOptions: RequestInit;

      // Check if we have files to upload
      if (formData.attachedFiles && formData.attachedFiles.length > 0) {
        // Use FormData for file uploads
        const submitFormData = new FormData();
        submitFormData.append('name', formData.name);
        submitFormData.append('email', formData.email);
        submitFormData.append('inquiry', formData.inquiry);
        submitFormData.append('message', formData.message);

        // Append files
        Array.from(formData.attachedFiles).forEach((file) => {
          submitFormData.append(`attachments`, file);
        });

        requestOptions = {
          method: 'POST',
          body: submitFormData,
          // Add mobile-friendly options
          mode: 'cors',
          credentials: 'omit',
          // Don't set Content-Type header - let browser set it with boundary
        };
      } else {
        // Use JSON for text-only submissions
        const submitData = {
          name: formData.name,
          email: formData.email,
          inquiry: formData.inquiry,
          message: formData.message
        };

        requestOptions = {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(submitData),
          // Add mobile-friendly options
          mode: 'cors',
          credentials: 'omit',
        };
      }

      // Send to backend API with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch(CONTACT_ENDPOINT, {
        ...requestOptions,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // Check if response is ok before trying to parse JSON
      if (!response.ok) {
        // Try to get error message from response
        let errorMessage = 'Failed to send message';
        try {
          const errorResult = await response.json();
          errorMessage = errorResult.error || errorMessage;
        } catch {
          // If JSON parsing fails, use status text
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      // Parse successful response
      await response.json();
      
      setSubmitStatus('success');
      // Reset form
      setFormData({
        name: '',
        inquiry: 'general',
        email: '',
        message: '',
        attachedFiles: null
      });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      setSubmitStatus('error');
      console.error('Contact form submission error:', error);
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          setErrorMessage('Request timed out. Please check your internet connection and try again.');
        } else if (error.message.includes('fetch')) {
          setErrorMessage('Network error. Please check your internet connection and try again.');
        } else {
          setErrorMessage(error.message);
        }
      } else {
        setErrorMessage('Failed to send message. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeFile = (index: number) => {
    if (formData.attachedFiles) {
      const dt = new DataTransfer();
      for (let i = 0; i < formData.attachedFiles.length; i++) {
        if (i !== index) {
          dt.items.add(formData.attachedFiles[i]);
        }
      }
      setFormData(prev => ({
        ...prev,
        attachedFiles: dt.files
      }));
      if (fileInputRef.current) {
        fileInputRef.current.files = dt.files;
      }
    }
  };

  return (
    <div className={styles.pageWrapper}>
      <Navbar isScrolled={isScrolled} />
      <div className={styles.container}>
        <div className={styles.contentGrid}>
          {/* Left Side - Graphic/Illustration */}
          <div className={styles.graphicSection}>
            <div className={styles.graphicContent}>
              <div className={styles.contactIllustration}>
                <div className={styles.messageIcon}>
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
                  </svg>
                </div>
                <div className={styles.connectLines}>
                  <div className={styles.line}></div>
                  <div className={styles.line}></div>
                  <div className={styles.line}></div>
                </div>
              </div>
              <h2 className={styles.graphicTitle}>Get in Touch</h2>
              <p className={styles.graphicSubtitle}>
                We'd love to hear from you. Send us a message and we'll respond as soon as possible.
              </p>
              <div className={styles.contactInfo}>
                <div className={styles.contactItem}>
                  <div className={styles.contactIcon}>
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                    </svg>
                  </div>
                  <span>Santa Cruz, CA</span>
                </div>
                <div className={styles.contactItem}>
                  <div className={styles.contactIcon}>
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                    </svg>
                  </div>
                  <span>canvastonotioninfo@gmail.com</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Contact Form */}
          <div className={styles.formSection}>
            <div className={styles.formContainer}>
              <h1 className={styles.formTitle}>Contact Us</h1>
              <p className={styles.formSubtitle}>
                Have a question or feedback? We're here to help.
              </p>

              {submitStatus === 'success' && (
                <div className={styles.successMessage}>
                  <div className={styles.successIcon}>
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                    </svg>
                  </div>
                  <p>Thank you! Your message has been sent successfully. We'll get back to you soon.</p>
                </div>
              )}

              {submitStatus === 'error' && (
                <div className={styles.errorMessage}>
                  <p>{errorMessage}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className={styles.contactForm}>
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label htmlFor={nameId}>Name *</label>
                    <input
                      type="text"
                      id={nameId}
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      disabled={isSubmitting}
                      placeholder="Your full name"
                      aria-describedby={formData.name ? undefined : `${nameId}-hint`}
                      autoComplete="name"
                    />
                    {!formData.name && (
                      <div id={`${nameId}-hint`} className={styles.fieldHint}>
                        Please enter your full name
                      </div>
                    )}
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label htmlFor={inquiryId}>Inquiry Type *</label>
                    <select
                      id={inquiryId}
                      name="inquiry"
                      value={formData.inquiry}
                      onChange={handleInputChange}
                      required
                      disabled={isSubmitting}
                      aria-describedby={`${inquiryId}-hint`}
                    >
                      <option value="general">General Question</option>
                      <option value="support">Technical Support</option>
                      <option value="feature">Feature Request</option>
                      <option value="bug">Bug Report</option>
                      <option value="billing">Billing</option>
                      <option value="partnership">Partnership</option>
                    </select>
                    <div id={`${inquiryId}-hint`} className={styles.fieldHint}>
                      Select the category that best matches your inquiry
                    </div>
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor={emailId}>Email Address *</label>
                  <input
                    type="email"
                    id={emailId}
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    disabled={isSubmitting}
                    placeholder="your.email@example.com"
                    aria-describedby={`${emailId}-hint`}
                    autoComplete="email"
                  />
                  <div id={`${emailId}-hint`} className={styles.fieldHint}>
                    We'll use this to respond to your inquiry
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor={messageId}>Message *</label>
                  <textarea
                    id={messageId}
                    name="message"
                    value={formData.message}
                    onChange={handleInputChange}
                    required
                    disabled={isSubmitting}
                    placeholder="Tell us how we can help you..."
                    rows={6}
                    aria-describedby={`${messageId}-hint`}
                  />
                  <div id={`${messageId}-hint`} className={styles.fieldHint}>
                    Please provide as much detail as possible about your inquiry
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor={attachmentsId}>Attach Files</label>
                  <div 
                    className={styles.fileUploadArea}
                    onClick={() => {
                      if (!(formData.attachedFiles && formData.attachedFiles.length >= 5) && !isSubmitting) {
                        fileInputRef.current?.click();
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        if (!(formData.attachedFiles && formData.attachedFiles.length >= 5) && !isSubmitting) {
                          fileInputRef.current?.click();
                        }
                      }
                    }}
                    tabIndex={0}
                    role="button"
                    aria-label="Click to select files"
                    aria-disabled={isSubmitting || (formData.attachedFiles ? formData.attachedFiles.length >= 5 : false)}
                  >
                    <input
                      type="file"
                      id={attachmentsId}
                      name="attachments"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      multiple
                      disabled={isSubmitting || (formData.attachedFiles ? formData.attachedFiles.length >= 5 : false)}
                      accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.gif"
                      className={styles.fileInput}
                      aria-describedby={`${attachmentsId}-hint`}
                    />
                    <div className={styles.fileUploadContent}>
                      <div className={styles.uploadIcon}>
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                        </svg>
                      </div>
                      <p>
                        {formData.attachedFiles && formData.attachedFiles.length >= 5 
                          ? 'Maximum files reached (5/5)' 
                          : formData.attachedFiles && formData.attachedFiles.length > 0
                            ? 'Click to add more files'
                            : 'Click to browse or drag files here'
                        }
                      </p>
                      <span>Select up to 5 files: PDF, DOC, TXT, PNG, JPG (max 10MB each)</span>
                    </div>
                  </div>
                  <div id={`${attachmentsId}-hint`} className={styles.fieldHint}>
                    Optional: Attach up to 5 relevant files to help us better understand your inquiry
                    {formData.attachedFiles && formData.attachedFiles.length > 0 && (
                      <span style={{ marginLeft: '8px', fontWeight: 'bold', color: '#4f46e5' }}>
                        ({formData.attachedFiles.length}/5 files selected)
                      </span>
                    )}
                  </div>
                  
                  {formData.attachedFiles && formData.attachedFiles.length > 0 && (
                    <div className={styles.fileList}>
                      {Array.from(formData.attachedFiles).map((file, index) => (
                        <div key={index} className={styles.fileItem}>
                          <div className={styles.fileInfo}>
                            <div className={styles.fileIcon}>
                              <svg viewBox="0 0 24 24" fill="currentColor">
                                <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                              </svg>
                            </div>
                            <div className={styles.fileDetails}>
                              <span className={styles.fileName}>{file.name}</span>
                              <span className={styles.fileSize}>
                                {(file.size / 1024).toFixed(1)} KB
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFile(index)}
                            className={styles.removeFileButton}
                            disabled={isSubmitting}
                          >
                            <IoClose />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className={styles.formActions}>
                  <button
                    type="submit"
                    disabled={isSubmitting || !formData.name || !formData.email || !formData.message}
                    className={styles.submitButton}
                  >
                    {isSubmitting ? (
                      <>
                        <div className={styles.spinner}></div>
                        Sending...
                      </>
                    ) : (
                      'Send Message'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Contact;
