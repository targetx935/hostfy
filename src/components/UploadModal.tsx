import React, { useState, useRef, useCallback } from 'react';
import { UploadCloud, X, Film, AlertCircle, Loader2, CheckCircle2, ImageIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getPlanSettings } from '../lib/planLimits';

interface UploadModalProps {
    onClose: () => void;
    onSuccess: () => void;
    showToast: (msg: string) => void;
    folders: any[];
    videoCount: number;
    userPlan?: string;
}

interface FileWithStatus {
    file: File;
    id: string;
    title: string;
    folderId: string;
    status: 'pending' | 'uploading' | 'success' | 'error';
    progress: number;
    errorMsg?: string;
    dbId?: string;
    thumbUrl?: string; // local blob url OR public url
    thumbFile?: File; // The generated or manually attached file
    thumbUploading?: boolean;
}

const generateVideoThumbnail = (file: File): Promise<File | null> => {
    return new Promise((resolve) => {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.muted = true;
        video.playsInline = true;

        const url = URL.createObjectURL(file);
        video.src = url;

        const cleanup = () => {
            try {
                if (url) URL.revokeObjectURL(url);
            } catch (e) { }
        };

        video.onloadedmetadata = () => {
            // Seek to 1 second, or middle of video if it's shorter than 2 seconds
            const targetTime = Math.min(1.0, video.duration / 2 || 0);
            video.currentTime = targetTime;
        };

        video.onseeked = () => {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                canvas.toBlob((blob) => {
                    cleanup();
                    if (blob) {
                        const thumbFile = new File([blob], "thumb.jpg", { type: 'image/jpeg' });
                        resolve(thumbFile);
                    } else {
                        resolve(null);
                    }
                }, 'image/jpeg', 0.8);
            } else {
                cleanup();
                resolve(null);
            }
        };

        video.onerror = () => {
            cleanup();
            resolve(null);
        };
    });
};

export function UploadModal({ onClose, onSuccess, showToast, folders, videoCount, userPlan = 'trial' }: UploadModalProps) {
    const planSettings = getPlanSettings(userPlan);
    const [files, setFiles] = useState<FileWithStatus[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [globalFolderId, setGlobalFolderId] = useState<string>('');
    const [isUploadingAny, setIsUploadingAny] = useState(false);
    const [uploadStep, setUploadStep] = useState<'files' | 'thumbnails'>('files');

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFilesAdded = (newFiles: FileList | File[]) => {
        const validFiles: FileWithStatus[] = [];

        Array.from(newFiles).forEach(file => {
            const currentTotal = videoCount + files.length + validFiles.length;
            if (currentTotal >= planSettings.maxVideos) {
                showToast(`Limite do plano atingido (${planSettings.maxVideos} vídeos). Faça upgrade para subir mais.`);
                return;
            }

            if (file.type.startsWith('video/')) {
                const id = Math.random().toString(36).substring(7);
                validFiles.push({
                    file,
                    id,
                    title: file.name.replace(/\.[^/.]+$/, ""),
                    folderId: globalFolderId,
                    status: 'pending',
                    progress: 0
                });

                // Generate auto-thumbnail in background
                generateVideoThumbnail(file).then(thumbFile => {
                    if (thumbFile) {
                        setFiles(prev => prev.map(f => {
                            if (f.id === id) {
                                return { ...f, thumbFile, thumbUrl: URL.createObjectURL(thumbFile) };
                            }
                            return f;
                        }));
                    }
                }).catch(() => { });

            } else {
                showToast(`O arquivo ${file.name} não é um vídeo suportado.`);
            }
        });

        if (validFiles.length > 0) {
            setFiles(prev => [...prev, ...validFiles]);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            handleFilesAdded(e.target.files);
            // Reset input so the same file can be selected again if removed
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const onDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    }, []);

    const onDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    }, []);

    const onDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFilesAdded(e.dataTransfer.files);
        }
    }, [globalFolderId]); // Depend on globalFolderId to assign it to new files natively

    const removeFile = (id: string) => {
        setFiles(prev => prev.filter(f => f.id !== id));
    };

    const updateFileProps = (id: string, updates: Partial<FileWithStatus>) => {
        setFiles(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
    }

    const handleUploadAll = async () => {
        const pendingFiles = files.filter(f => f.status === 'pending' || f.status === 'error');
        if (pendingFiles.length === 0) return;

        setIsUploadingAny(true);
        let hasErrors = false;
        let successCount = 0;

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Usuário não autenticado.');

            // Process files sequentially (or you could use Promise.all for parallel, 
            // but sequential is safer for Supabase limits on large files)
            for (const fileObj of pendingFiles) {
                updateFileProps(fileObj.id, { status: 'uploading', progress: 0, errorMsg: undefined });

                try {
                    const fileExt = fileObj.file.name.split('.').pop();
                    const fileName = `${user.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

                    // Fake progress interval
                    const progressInterval = setInterval(() => {
                        setFiles(currentFiles =>
                            currentFiles.map(f =>
                                f.id === fileObj.id && f.status === 'uploading'
                                    ? { ...f, progress: Math.min(f.progress + 10, 90) }
                                    : f
                            )
                        );
                    }, 500);

                    const { error: uploadError } = await supabase.storage
                        .from('videos')
                        .upload(fileName, fileObj.file, {
                            cacheControl: '3600',
                            upsert: false
                        });

                    clearInterval(progressInterval);

                    if (uploadError) throw uploadError;

                    const { data: { publicUrl } } = supabase.storage
                        .from('videos')
                        .getPublicUrl(fileName);

                    const { data: dbData, error: dbError } = await supabase
                        .from('videos')
                        .insert({
                            user_id: user.id,
                            title: fileObj.title,
                            url: publicUrl, // URL bruta
                            folder_id: fileObj.folderId || null,
                            status: 'processing' // Processamento HLS via Mux pendente
                        })
                        .select()
                        .single();

                    if (dbError) throw dbError;

                    // Create success notification for the user
                    await supabase.from('notifications').insert({
                        user_id: user.id,
                        title: 'Upload Iniciado 🚀',
                        message: `O vídeo "${fileObj.title}" foi enviado e agora está sendo processado.`,
                        type: 'success'
                    });

                    // Automatically upload the generated thumbnail if one was created
                    let finalThumbUrl = undefined;
                    if (fileObj.thumbFile && dbData && dbData.id) {
                        try {
                            const num = Math.random().toString(36).substring(7);
                            const thumbFilePath = `${user.id}/thumbnails/${dbData.id}-${num}-auto.jpg`;

                            const { error: thumbUploadError } = await supabase.storage
                                .from('videos')
                                .upload(thumbFilePath, fileObj.thumbFile, { cacheControl: '3600', upsert: true });

                            if (!thumbUploadError) {
                                const { data: { publicUrl: thumbPublicUrl } } = supabase.storage
                                    .from('videos')
                                    .getPublicUrl(thumbFilePath);

                                await supabase
                                    .from('videos')
                                    .update({ thumbnail_url: thumbPublicUrl })
                                    .eq('id', dbData.id);

                                finalThumbUrl = thumbPublicUrl;
                                // We keep the publicUrl in thumbUrl so the UI knows it's the real one
                            }
                        } catch (e) {
                            console.error("Falha ao upar thumbnail gerada automaticamente:", e);
                        }
                    }

                    // Invocar Edge Function de Transcodificação async
                    if (dbData && dbData.id) {
                        try {
                            const { error: invokeErr } = await supabase.functions.invoke('process-video', {
                                body: { videoId: dbData.id, videoUrl: publicUrl, filePath: fileName }
                            });
                            if (invokeErr) console.error("Falha ao invocar mux parser:", invokeErr);
                        } catch (e) {
                            console.error("Falha no invoke:", e);
                        }
                    }

                    updateFileProps(fileObj.id, {
                        status: 'success',
                        progress: 100,
                        dbId: dbData?.id,
                        ...(finalThumbUrl ? { thumbUrl: finalThumbUrl } : {})
                    });
                    successCount++;

                } catch (err: any) {
                    console.error("Erro upando", fileObj.file.name, err);
                    updateFileProps(fileObj.id, { status: 'error', errorMsg: err.message || 'Erro no upload' });
                    hasErrors = true;
                }
            }

            if (successCount > 0) {
                showToast(`${successCount} vídeo(s) enviado(s)!`);
                onSuccess();

                setTimeout(() => {
                    setUploadStep('thumbnails');
                }, 1500);
            } else if (hasErrors) {
                showToast('Alguns uploads falharam. Verifique a lista.');
            }

        } catch (err: any) {
            console.error(err);
            showToast(err.message || 'Erro crítico de autenticação');
        } finally {
            setIsUploadingAny(false);
        }
    };

    const hasPendingFiles = files.some(f => f.status === 'pending' || f.status === 'error');
    const hasAnyFiles = files.length > 0;
    const successfullyUploadedFiles = files.filter(f => f.status === 'success' && f.dbId);

    const handleThumbUpload = async (fileObj: FileWithStatus, file: File) => {
        if (!fileObj.dbId) return;
        try {
            updateFileProps(fileObj.id, { thumbUploading: true });

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Usuário não autenticado");

            const fileExt = file.name.split('.').pop();
            const fileName = `${fileObj.dbId}-${Date.now()}.${fileExt}`;
            const filePath = `${user.id}/thumbnails/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('videos')
                .upload(filePath, file, { cacheControl: '3600', upsert: true });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('videos')
                .getPublicUrl(filePath);

            const { error: updateError } = await supabase
                .from('videos')
                .update({ thumbnail_url: publicUrl })
                .eq('id', fileObj.dbId);

            if (updateError) throw updateError;

            updateFileProps(fileObj.id, { thumbUrl: publicUrl });
            onSuccess(); // refresh dashboard list again since thumbnail was updated
            showToast('Capa definida com sucesso!');
        } catch (err: any) {
            showToast(`Erro no upload da capa: ${err.message || 'Desconhecido'}`);
        } finally {
            updateFileProps(fileObj.id, { thumbUploading: false });
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]">
            <div className={`bg-brand-dark-lighter border ${isDragging ? 'border-brand-primary shadow-[0_0_30px_rgba(232,42,88,0.3)]' : 'border-white/10 shadow-2xl'} p-6 md:p-8 rounded-2xl w-full max-w-2xl relative transition-all max-h-[90vh] flex flex-col`}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
            >
                <button
                    onClick={onClose}
                    disabled={isUploadingAny}
                    className="absolute top-4 right-4 text-neutral-500 hover:text-white cursor-pointer transition-colors p-2 disabled:opacity-50"
                >
                    <X className="w-5 h-5" />
                </button>

                <h2 className="text-xl font-bold mb-6 text-white flex items-center gap-2 shrink-0">
                    <UploadCloud className="text-brand-primary" />
                    {uploadStep === 'files' ? 'Upload de Vídeos' : 'Escolher Capas (Opcional)'}
                </h2>

                {uploadStep === 'files' ? (
                    <>
                        {isDragging && (
                            <div className="absolute inset-0 bg-brand-primary/10 backdrop-blur-sm z-10 rounded-2xl flex flex-col items-center justify-center border-2 border-dashed border-brand-primary">
                                <UploadCloud className="w-16 h-16 text-brand-primary mb-4 animate-bounce" />
                                <h3 className="text-2xl font-bold text-white">Solte os vídeos aqui</h3>
                            </div>
                        )}

                        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                            {!hasAnyFiles ? (
                                <div
                                    className="border-2 border-dashed border-white/10 rounded-xl p-12 flex flex-col items-center justify-center text-center hover:border-brand-primary/50 transition-colors cursor-pointer bg-brand-dark/30 group my-4"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        accept="video/*"
                                        multiple
                                        onChange={handleFileChange}
                                    />
                                    <div className="bg-white/5 p-5 rounded-full mb-4 group-hover:bg-brand-primary/20 transition-colors group-hover:scale-110 duration-300">
                                        <UploadCloud className="w-10 h-10 text-neutral-400 group-hover:text-brand-primary transition-colors" />
                                    </div>
                                    <p className="font-medium text-white text-lg mb-2">Clique ou arraste vídeos para cá</p>
                                    <p className="text-sm text-neutral-500">MP4, WEBM, MOV até 2GB por arquivo</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {/* Global Folder Selection */}
                                    {folders.length > 0 && files.some(f => f.status === 'pending') && (
                                        <div className="bg-white/5 p-4 rounded-xl border border-white/10 mb-6 sticky top-0 backdrop-blur-md z-10">
                                            <label className="block text-sm font-medium text-neutral-300 mb-2">Adicionar todos os novos vídeos na pasta:</label>
                                            <select
                                                value={globalFolderId}
                                                onChange={(e) => {
                                                    setGlobalFolderId(e.target.value);
                                                    // Apply to all pending that don't have custom folders maybe?
                                                    // For simplicity, we just apply to all pending.
                                                    setFiles(prev => prev.map(f => f.status === 'pending' ? { ...f, folderId: e.target.value } : f));
                                                }}
                                                disabled={isUploadingAny}
                                                className="w-full bg-brand-dark border border-white/10 rounded-lg px-4 py-2.5 text-white focus:border-brand-primary outline-none transition-colors disabled:opacity-50 appearance-none"
                                            >
                                                <option value="">Nenhuma pasta (Raiz da Biblioteca)</option>
                                                {folders.map(f => (
                                                    <option key={f.id} value={f.id}>{f.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    {/* Add More Button */}
                                    <div className="flex justify-end mb-4">
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={isUploadingAny}
                                            className="text-sm text-brand-primary hover:text-brand-primary-light font-medium flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                        >
                                            <UploadCloud className="w-4 h-4" /> Adicionar mais vídeos
                                        </button>
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            className="hidden"
                                            accept="video/*"
                                            multiple
                                            onChange={handleFileChange}
                                        />
                                    </div>

                                    {/* File List */}
                                    <div className="space-y-3">
                                        {files.map((fileObj) => (
                                            <div key={fileObj.id} className={`bg-brand-dark/50 border ${fileObj.status === 'error' ? 'border-red-500/50' : fileObj.status === 'success' ? 'border-emerald-500/30' : 'border-white/10'} rounded-xl p-4 transition-all`}>
                                                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                                                    <div className="flex items-center gap-3 overflow-hidden flex-1">
                                                        <div className={`p-2 rounded-lg shrink-0 ${fileObj.status === 'success' ? 'bg-emerald-500/20' : fileObj.status === 'error' ? 'bg-red-500/20' : 'bg-brand-primary/20'}`}>
                                                            {fileObj.status === 'success' ? <CheckCircle2 className="w-6 h-6 text-emerald-500" /> :
                                                                fileObj.status === 'error' ? <AlertCircle className="w-6 h-6 text-red-500" /> :
                                                                    <Film className="w-6 h-6 text-brand-primary" />}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <input
                                                                type="text"
                                                                value={fileObj.title}
                                                                onChange={(e) => updateFileProps(fileObj.id, { title: e.target.value })}
                                                                disabled={fileObj.status !== 'pending' && fileObj.status !== 'error'}
                                                                className="w-full bg-transparent border-b border-white/10 focus:border-brand-primary px-1 py-1 text-sm font-medium text-white outline-none transition-colors truncate disabled:opacity-80 disabled:border-transparent"
                                                                placeholder="Título do Vídeo"
                                                            />
                                                            <p className="text-xs text-neutral-500 mt-1 px-1">
                                                                {(fileObj.file.size / (1024 * 1024)).toFixed(2)} MB
                                                                {fileObj.errorMsg && <span className="text-red-400 ml-2">• {fileObj.errorMsg}</span>}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {/* Status / Actions */}
                                                    <div className="flex items-center gap-3 self-end sm:self-auto w-full sm:w-auto mt-2 sm:mt-0">
                                                        {fileObj.status === 'uploading' ? (
                                                            <div className="flex items-center gap-2 w-full sm:w-32">
                                                                <div className="flex-1 h-1.5 bg-brand-dark rounded-full overflow-hidden">
                                                                    <div className="h-full bg-brand-primary transition-all duration-300" style={{ width: `${fileObj.progress}%` }}></div>
                                                                </div>
                                                                <span className="text-xs text-brand-primary font-medium w-8">{fileObj.progress}%</span>
                                                            </div>
                                                        ) : fileObj.status === 'pending' || fileObj.status === 'error' ? (
                                                            <button onClick={() => removeFile(fileObj.id)} className="text-neutral-500 hover:text-red-400 p-2 rounded-lg hover:bg-red-500/10 transition-colors ml-auto sm:ml-0 cursor-pointer text-xs flex items-center gap-1">
                                                                <X className="w-4 h-4" /> <span className="sm:hidden">Remover</span>
                                                            </button>
                                                        ) : null}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer Actions */}
                        {hasAnyFiles && (
                            <div className="pt-6 mt-4 border-t border-white/10 shrink-0">
                                <div className="flex items-center justify-between font-medium text-sm text-neutral-400 mb-4">
                                    <span>{files.length} arquivo(s) selecionado(s)</span>
                                    {files.some(f => f.status === 'success') && (
                                        <span className="text-emerald-400">{files.filter(f => f.status === 'success').length} concluído(s)</span>
                                    )}
                                </div>

                                <button
                                    onClick={handleUploadAll}
                                    disabled={isUploadingAny || !hasPendingFiles}
                                    className="w-full bg-brand-primary hover:bg-brand-primary-light text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(232,42,88,0.3)] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isUploadingAny ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Enviando Vídeos...
                                        </>
                                    ) : hasPendingFiles ? (
                                        <>
                                            <UploadCloud className="w-5 h-5" />
                                            Fazer Upload de {files.filter(f => f.status === 'pending' || f.status === 'error').length} Vídeo(s)
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle2 className="w-5 h-5" />
                                            Todos os uploads concluídos
                                        </>
                                    )}
                                </button>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="flex-1 flex flex-col overflow-hidden max-h-[70vh]">
                        <p className="text-neutral-400 text-sm mb-4">Seus vídeos estão sendo processados pela nuvem. Enquanto isso, você pode subir uma capa personalizada agora mesmo ou apenas fechar e fazer isso depois.</p>
                        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
                            {successfullyUploadedFiles.map(fileObj => (
                                <div key={fileObj.id} className="bg-brand-dark/50 border border-white/10 rounded-xl p-4 flex flex-col sm:flex-row items-center gap-4">
                                    {fileObj.thumbUrl ? (
                                        <div className="w-24 h-14 bg-black rounded overflow-hidden border border-white/10 shrink-0 relative">
                                            <img src={fileObj.thumbUrl} alt="Capa" className="w-full h-full object-cover" />
                                        </div>
                                    ) : (
                                        <div className="w-24 h-14 bg-neutral-800 rounded flex items-center justify-center border border-white/10 shrink-0 relative">
                                            <ImageIcon className="w-6 h-6 text-neutral-500" />
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0 w-full">
                                        <p className="font-medium text-white truncate text-sm">{fileObj.title}</p>
                                        {fileObj.thumbUrl ? (
                                            <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Capa Definida</p>
                                        ) : (
                                            <p className="text-xs text-neutral-500 mt-1">Capa Mux gerada automaticamente em breve...</p>
                                        )}
                                    </div>
                                    <div className="flex-shrink-0">
                                        <input
                                            target-id={fileObj.id}
                                            type="file"
                                            hidden
                                            id={`thumb-upload-${fileObj.id}`}
                                            accept="image/png, image/jpeg, image/webp"
                                            onChange={(e) => {
                                                if (e.target.files?.[0]) handleThumbUpload(fileObj, e.target.files[0]);
                                            }}
                                        />
                                        <button
                                            onClick={() => document.getElementById(`thumb-upload-${fileObj.id}`)?.click()}
                                            disabled={fileObj.thumbUploading}
                                            className="bg-white/5 hover:bg-white/10 text-white border border-white/10 py-2 px-3 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                                        >
                                            {fileObj.thumbUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                                            {fileObj.thumbUrl ? 'Trocar Capa' : 'Enviar Capa'}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="pt-6 mt-4 border-t border-white/10 shrink-0">
                            <button
                                onClick={onClose}
                                className="w-full bg-brand-primary hover:bg-brand-primary-light text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(232,42,88,0.3)]"
                            >
                                <CheckCircle2 className="w-5 h-5" /> Terminar e Voltar para Painel
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
