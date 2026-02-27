import React, { useState, useRef, useCallback } from 'react';
import { UploadCloud, X, Film, CircleAlert, Loader2, CircleCheck, ImageIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getPlanSettings } from '../lib/planLimits';

interface FileWithStatus {
    file: File;
    id: string;
    title: string;
    progress: number;
    status: 'pending' | 'uploading' | 'processing' | 'success' | 'error';
    error?: string;
    muxAssetId?: string;
    muxPlaybackId?: string;
    thumbUrl?: string;
}

interface UploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    showToast?: (msg: string) => void;
}

export const UploadModal = ({ isOpen, onClose, onSuccess, showToast }: UploadModalProps) => {
    const [files, setFiles] = useState<FileWithStatus[]>([]);
    const [uploadStep, setUploadStep] = useState<'selection' | 'uploading' | 'finished'>('selection');
    const [isUploadingAny, setIsUploadingAny] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const resetModal = useCallback(() => {
        setFiles([]);
        setUploadStep('selection');
        setIsUploadingAny(false);
    }, []);

    const handleClose = useCallback(() => {
        if (uploadStep === 'uploading') {
            if (window.confirm('Um upload está em andamento. Deseja realmente cancelar?')) {
                onClose();
                resetModal();
            }
        } else {
            onClose();
            resetModal();
        }
    }, [uploadStep, onClose, resetModal]);

    const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = Array.from(e.target.files || []);
        if (selectedFiles.length === 0) return;

        const newFiles: FileWithStatus[] = selectedFiles.map(file => ({
            file,
            id: Math.random().toString(36).substr(2, 9),
            title: file.name.split('.').slice(0, -1).join('.'),
            progress: 0,
            status: 'pending'
        }));

        setFiles(prev => [...prev, ...newFiles]);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const removeFile = (id: string) => {
        setFiles(prev => prev.filter(f => f.id !== id));
    };

    const updateFileProps = (id: string, props: Partial<FileWithStatus>) => {
        setFiles(prev => prev.map(f => f.id === id ? { ...f, ...props } : f));
    };

    const startUpload = async () => {
        if (files.length === 0) return;

        // Check plan limits before starting
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: profile } = await supabase.from('profiles').select('plan').eq('id', user.id).single();
            const planSettings = getPlanSettings(profile?.plan || 'trial');

            const { count } = await supabase.from('videos').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
            const currentVideos = count || 0;

            if (currentVideos + files.length > planSettings.maxVideos) {
                if (showToast) showToast(`Limite do plano atingido ($planSettings.maxVideos vídeos). Faça upgrade para subir mais.`);
                return;
            }
        } catch (err) {
            console.error('Limit check error:', err);
        }

        setUploadStep('uploading');
        setIsUploadingAny(true);

        let successCount = 0;
        let hasErrors = false;

        for (const fileObj of files) {
            if (fileObj.status !== 'pending') continue;

            try {
                updateFileProps(fileObj.id, { status: 'uploading', progress: 5 });

                const { data: { user } } = await supabase.auth.getUser();
                if (!user) throw new Error('Usuário não encontrado');

                // 1. Criar registro do vídeo no Supabase (Pendente)
                // Isso nos dá o ID do vídeo para enviar ao Mux no passthrough
                const { data: dbVideo, error: dbError } = await supabase.from('videos').insert({
                    user_id: user.id,
                    title: fileObj.title,
                    status: 'processing',
                    file_size: fileObj.file.size,
                    duration: 0
                }).select('id').single();

                if (dbError) throw dbError;
                const videoId = dbVideo.id;

                updateFileProps(fileObj.id, { progress: 15 });

                // 2. Obter URL de Upload Direto do Edge Function
                const { data, error: edgeError } = await supabase.functions.invoke('get-mux-upload-url', {
                    body: {
                        filename: fileObj.file.name,
                        videoId: videoId,
                        filePath: "" // Não usamos arquivo temporário no Direct Upload
                    }
                });

                if (edgeError) {
                    console.error('Edge Function Error:', edgeError);
                    let errMsg = edgeError.message;

                    // Supabase FunctionsHttpError usually has the response in context
                    if ((edgeError as any).context && typeof (edgeError as any).context.json === 'function') {
                        try {
                            const body = await (edgeError as any).context.json();
                            errMsg = body.error || body.message || errMsg;
                        } catch (e) {
                            console.error('Failed to parse error body:', e);
                        }
                    }

                    throw new Error(errMsg || 'Falha ao obter URL de upload');
                }

                if (!data?.url) throw new Error('Falha ao obter URL de upload (Mux)');

                updateFileProps(fileObj.id, { progress: 30, muxAssetId: data.assetId });

                // 3. Upload direto para o Mux (PUT)
                const uploadResponse = await fetch(data.url, {
                    method: 'PUT',
                    body: fileObj.file,
                    headers: { 'Content-Type': fileObj.file.type }
                });

                if (!uploadResponse.ok) throw new Error('Falha no upload para o servidor de processamento (Mux)');

                updateFileProps(fileObj.id, { progress: 100, status: 'success' });
                successCount++;

            } catch (err: any) {
                console.error(`Erro no upload de ${fileObj.file.name}:`, err);
                updateFileProps(fileObj.id, { status: 'error', error: err.message });
                hasErrors = true;
            }
        }

        setIsUploadingAny(false);
        setUploadStep('finished');

        if (successCount > 0) {
            if (showToast) showToast(`${successCount} vídeo(s) enviado(s) com sucesso!`);
            if (onSuccess) onSuccess();
        }

        if (!hasErrors) {
            if (showToast) showToast('Todos os uploads foram concluídos com sucesso!');
        }
    };

    if (!isOpen) return null;

    const successfullyUploadedFiles = files.filter(f => f.status === 'success');

    const handleThumbUpload = async (fileObj: FileWithStatus, thumbFile: File) => {
        try {
            updateFileProps(fileObj.id, { status: 'processing' });

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const fileExt = thumbFile.name.split('.').pop();
            const fileName = `${user.id}/${fileObj.muxAssetId}-thumb.${fileExt}`;

            // Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('thumbnails')
                .upload(fileName, thumbFile, { upsert: true });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('thumbnails')
                .getPublicUrl(fileName);

            // Update DB
            const { error: updateError } = await supabase
                .from('videos')
                .update({ thumbnail_url: publicUrl })
                .eq('mux_asset_id', fileObj.muxAssetId);

            if (updateError) throw updateError;

            updateFileProps(fileObj.id, { status: 'success', thumbUrl: publicUrl });
            if (onSuccess) onSuccess();
            if (showToast) showToast('Capa atualizada!');
        } catch (err: any) {
            if (showToast) showToast('Erro ao subir capa: ' + err.message);
            updateFileProps(fileObj.id, { status: 'error' });
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 bg-black/80 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
            <div className="bg-brand-dark-lighter w-full max-w-2xl rounded-2xl border border-white/10 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">

                {/* Header */}
                <div className="p-6 border-b border-white/5 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-white">Subir novos vídeos</h2>
                        <p className="text-xs text-neutral-400 mt-1">Hospedagem segura e otimizada para suas vendas</p>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-2 hover:bg-white/5 rounded-lg text-neutral-400 hover:text-white transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-white/10">

                    {uploadStep === 'selection' && (
                        <div className="space-y-6">
                            {/* Drag & Drop Area */}
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed border-white/10 rounded-2xl p-12 flex flex-col items-center justify-center text-center hover:border-brand-primary/50 hover:bg-brand-primary/5 transition-all cursor-pointer group"
                            >
                                <div className="w-16 h-16 bg-brand-primary/10 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <UploadCloud className="w-8 h-8 text-brand-primary" />
                                </div>
                                <h3 className="text-white font-bold mb-1 text-lg">Clique ou arraste seus arquivos aqui</h3>
                                <p className="text-neutral-500 text-sm max-w-xs">Formatos aceitos: MP4, MOV, AVI. <br /> Recomendamos H.264 para melhor performance.</p>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={onFileSelect}
                                    multiple
                                    accept="video/*"
                                    className="hidden"
                                />
                            </div>

                            {/* File List */}
                            {files.length > 0 && (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-sm font-bold text-white uppercase tracking-wider">{files.length} {files.length === 1 ? 'Vídeo Selecionado' : 'Vídeos Selecionados'}</h4>
                                        <button onClick={() => setFiles([])} className="text-[10px] font-bold text-neutral-500 hover:text-white uppercase transition-colors">Limpar Tudo</button>
                                    </div>
                                    <div className="space-y-2">
                                        {files.map((fileObj) => (
                                            <div key={fileObj.id} className="p-4 bg-white/5 rounded-xl border border-white/5 flex items-center justify-between group hover:border-white/10 transition-colors">
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    <div className="w-10 h-10 bg-brand-primary/10 rounded-lg flex items-center justify-center shrink-0">
                                                        <Film className="w-5 h-5 text-brand-primary" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-bold text-white truncate pr-4">{fileObj.title}</p>
                                                        <p className="text-[10px] text-neutral-500 uppercase">{(fileObj.file.size / (1024 * 1024)).toFixed(1)} MB</p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => removeFile(fileObj.id)}
                                                    className="p-2 text-neutral-600 hover:text-red-400 transition-colors"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {uploadStep === 'uploading' && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h3 className="text-white font-bold flex items-center gap-2">
                                    <Loader2 className="w-5 h-5 text-brand-primary animate-spin" />
                                    Enviando arquivos...
                                </h3>
                                <span className="text-xs font-bold text-neutral-500">
                                    {files.filter(f => f.status === 'success').length} de {files.length} concluídos
                                </span>
                            </div>

                            <div className="space-y-4">
                                {files.map((fileObj) => (
                                    <div key={fileObj.id} className="p-4 bg-white/5 rounded-xl border border-white/10">
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                                            <div className="flex items-center gap-3 overflow-hidden flex-1">
                                                <div className={`p-2 rounded-lg shrink-0 ${fileObj.status === 'success' ? 'bg-emerald-500/20' : fileObj.status === 'error' ? 'bg-red-500/20' : 'bg-brand-primary/20'}`}>
                                                    {fileObj.status === 'success' ? <CircleCheck className="w-6 h-6 text-emerald-500" /> :
                                                        fileObj.status === 'error' ? <CircleAlert className="w-6 h-6 text-red-500" /> :
                                                            <Film className="w-6 h-6 text-brand-primary" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-center mb-1">
                                                        <p className="text-sm font-bold text-white truncate pr-2">{fileObj.title}</p>
                                                        <span className={`text-[10px] font-black uppercase ${fileObj.status === 'error' ? 'text-red-400' : 'text-neutral-400'}`}>
                                                            {fileObj.status === 'uploading' ? `${fileObj.progress}%` :
                                                                fileObj.status === 'processing' ? 'Processando...' :
                                                                    fileObj.status === 'success' ? 'Finalizado' :
                                                                        fileObj.status === 'error' ? 'Erro' : 'Aguardando'}
                                                        </span>
                                                    </div>
                                                    <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full transition-all duration-300 ${fileObj.status === 'error' ? 'bg-red-500' : 'bg-brand-primary'}`}
                                                            style={{ width: `${fileObj.progress}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        {fileObj.status === 'error' && (
                                            <p className="mt-2 text-[10px] text-red-400 bg-red-400/10 px-2 py-1 rounded border border-red-400/20">
                                                {fileObj.error || 'Erro inesperado no envio.'}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {uploadStep === 'finished' && (
                        <div className="space-y-6 text-center py-8">
                            <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                                {files.some(f => f.status === 'error') ? (
                                    <CircleAlert className="w-10 h-10 text-red-500" />
                                ) : (
                                    <CircleCheck className="w-10 h-10 text-emerald-500" />
                                )}
                            </div>
                            <h2 className="text-3xl font-black text-white">
                                {files.every(f => f.status === 'success') ? 'Upload finalizado!' : 'Concluído com avisos'}
                            </h2>
                            <p className="text-neutral-400 max-w-sm mx-auto">
                                {files.some(f => f.status === 'success')
                                    ? 'Seus vídeos foram enviados e estão sendo processados pela nossa CDN global. Eles aparecerão no seu painel em alguns segundos.'
                                    : 'Ocorreu um problema ao enviar seus vídeos. Verifique as mensagens de erro abaixo.'}
                            </p>

                            {files.some(f => f.status === 'error') && (
                                <div className="mt-8 space-y-3 text-left">
                                    <h4 className="text-xs font-bold text-red-400 uppercase tracking-wider px-2">Erros encontrados:</h4>
                                    {files.filter(f => f.status === 'error').map(file => (
                                        <div key={file.id} className="p-4 bg-red-500/5 border border-red-500/10 rounded-xl flex items-center gap-3">
                                            <CircleAlert className="w-5 h-5 text-red-500 shrink-0" />
                                            <div className="min-w-0">
                                                <p className="text-sm font-bold text-white truncate">{file.title}</p>
                                                <p className="text-xs text-red-400/80">{file.error || 'Erro desconhecido'}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {successfullyUploadedFiles.length > 0 && (
                                <div className="mt-12 text-left space-y-4">
                                    <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-[0.2em] px-2 italic">Deseja adicionar uma capa customizada agora?</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {successfullyUploadedFiles.map(fileObj => (
                                            <div key={fileObj.id} className="p-4 bg-white/5 rounded-2xl border border-white/5 flex items-center gap-4 group">
                                                <div
                                                    className="w-16 h-12 bg-black/40 rounded-lg flex items-center justify-center shrink-0 cursor-pointer overflow-hidden border border-white/5 group-hover:border-brand-primary/50 transition-all relative group"
                                                    onClick={() => {
                                                        const input = document.createElement('input');
                                                        input.type = 'file';
                                                        input.accept = 'image/*';
                                                        input.onchange = (e) => {
                                                            const file = (e.target as HTMLInputElement).files?.[0];
                                                            if (file) handleThumbUpload(fileObj, file);
                                                        };
                                                        input.click();
                                                    }}
                                                >
                                                    {fileObj.thumbUrl ? (
                                                        <img src={fileObj.thumbUrl} alt="Thumb" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <ImageIcon className="w-6 h-6 text-neutral-600 group-hover:text-brand-primary transition-colors" />
                                                    )}
                                                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <span className="text-[8px] font-bold text-white uppercase">Alterar</span>
                                                    </div>
                                                </div>
                                                <div className="flex-1 min-w-0 w-full">
                                                    <p className="font-medium text-white truncate text-sm">{fileObj.title}</p>
                                                    {fileObj.thumbUrl ? (
                                                        <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1"><CircleCheck className="w-3 h-3" /> Capa Definida</p>
                                                    ) : (
                                                        <p className="text-xs text-neutral-500 mt-1">Capa Mux gerada automaticamente em breve...</p>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t border-white/5 bg-black/20">
                    {uploadStep === 'selection' ? (
                        <div className="flex flex-col sm:flex-row gap-3">
                            <button
                                onClick={handleClose}
                                className="flex-1 py-3 px-4 rounded-xl text-sm font-bold text-neutral-400 hover:text-white transition-colors border border-transparent hover:border-white/10"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={startUpload}
                                disabled={files.length === 0}
                                className="flex-[2] bg-brand-primary hover:bg-brand-primary-light text-white font-bold py-3 px-8 rounded-xl transition-all shadow-xl shadow-brand-primary/20 disabled:opacity-50 disabled:grayscale disabled:shadow-none hover:scale-[1.02] flex items-center justify-center gap-2"
                            >
                                <UploadCloud className="w-5 h-5" />
                                Enviar {files.length > 0 ? `${files.length} vídeo(s)` : ''}
                            </button>
                        </div>
                    ) : uploadStep === 'uploading' ? (
                        <button
                            disabled
                            className="w-full bg-white/5 text-neutral-500 font-bold py-3 px-4 rounded-xl cursor-not-allowed flex items-center justify-center gap-3"
                        >
                            {isUploadingAny ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Aguarde a conclusão do envio...
                                </>
                            ) : (
                                <>
                                    <CircleCheck className="w-5 h-5" />
                                    Todos os uploads concluídos
                                </>
                            )}
                        </button>
                    ) : (
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={handleClose}
                                className="w-full bg-brand-primary hover:bg-brand-primary-light text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(232,42,88,0.3)]"
                            >
                                <CircleCheck className="w-5 h-5" /> Terminar e Voltar para Painel
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
