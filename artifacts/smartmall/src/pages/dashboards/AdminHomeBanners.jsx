import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import {
    CalendarClock, ChevronDown, ChevronUp, Eye, EyeOff, ImagePlus, LayoutPanelTop,
    Loader2, Pencil, Plus, Save, Trash2, Upload, X
} from 'lucide-react';

const EMPTY_BANNER = {
    image_position: 'center',
    placement: 'top',
    title_ar: '',
    title_en: '',
    body_ar: '',
    body_en: '',
    badge_ar: '',
    badge_en: '',
    cta_label_ar: '',
    cta_label_en: '',
    link_type: 'none',
    link_url: '',
    is_active: true,
    starts_at: '',
    ends_at: '',
    sort_order: 0,
};

const storageUrl = (path) => {
    if (!path) return '';
    if (/^https?:\/\//i.test(path)) return path;
    return path.startsWith('/storage/') ? path : `/storage/${path}`;
};

const toInputDate = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value).slice(0, 16);
    const pad = (number) => String(number).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const statusLabel = (banner) => {
    if (!banner.is_active) return ['غير فعال', 'text-gray-400 bg-gray-500/10'];
    const now = Date.now();
    if (banner.starts_at && new Date(banner.starts_at).getTime() > now) return ['مجدول', 'text-amber-300 bg-amber-500/10'];
    if (banner.ends_at && new Date(banner.ends_at).getTime() < now) return ['منتهٍ', 'text-red-300 bg-red-500/10'];
    return ['نشط الآن', 'text-emerald-300 bg-emerald-500/10'];
};

function Preview({ banner, imagePreview }) {
    const image = imagePreview || storageUrl(banner.image_url || banner.image);
    return (
        <div className="relative aspect-[1.85/1] overflow-hidden rounded-2xl border border-white/10 bg-[#152640]">
            {image ? (
                <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: banner.image_position || 'center' }} />
            ) : (
                <div className="absolute inset-0 flex items-center justify-center text-indigo-200/50"><ImagePlus className="h-10 w-10" /></div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#071426] via-[#071426]/35 to-transparent" />
            <div className="absolute inset-x-4 bottom-4 text-right" dir="rtl">
                {banner.badge_ar && <span className="mb-2 inline-flex rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold text-amber-200">{banner.badge_ar}</span>}
                <div className="text-lg font-extrabold text-white line-clamp-2">{banner.title_ar || 'عنوان البانر'}</div>
                <div className="mt-1 text-xs text-white/70 line-clamp-2">{banner.body_ar || 'وصف مختصر يظهر للعميل هنا'}</div>
                {banner.cta_label_ar && <span className="mt-3 inline-flex rounded-full bg-white px-3 py-1.5 text-xs font-bold text-[#163a65]">{banner.cta_label_ar}</span>}
            </div>
        </div>
    );
}

function Field({ label, value, onChange, type = 'text', placeholder, dir = 'rtl' }) {
    return (
        <label className="block text-right">
            <span className="mb-1.5 block text-xs font-bold text-gray-400">{label}</span>
            <input type={type} value={value ?? ''} placeholder={placeholder} dir={dir} onChange={(event) => onChange(event.target.value)} className="input-field" />
        </label>
    );
}

function TextAreaField({ label, value, onChange, placeholder }) {
    return (
        <label className="block text-right">
            <span className="mb-1.5 block text-xs font-bold text-gray-400">{label}</span>
            <textarea value={value ?? ''} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} className="input-field min-h-[76px] resize-y" dir="rtl" />
        </label>
    );
}

const AdminHomeBanners = () => {
    const queryClient = useQueryClient();
    const [editing, setEditing] = useState(null);
    const [draft, setDraft] = useState(EMPTY_BANNER);
    const [file, setFile] = useState(null);
    const [imagePreview, setImagePreview] = useState('');
    const [formError, setFormError] = useState('');

    const { data: banners = [], isLoading } = useQuery({
        queryKey: ['admin-home-banners'],
        queryFn: async () => (await api.get('/admin/home-banners')).data,
    });

    const saveMutation = useMutation({
        mutationFn: async () => {
            const form = new FormData();
            Object.entries(draft).forEach(([key, value]) => {
                if (value !== null && value !== undefined && value !== '') form.append(key, String(value));
            });
            if (file) form.append('image', file);
            if (editing?.id) {
                form.append('_method', 'PUT');
                return api.post(`/admin/home-banners/${editing.id}`, form);
            }
            return api.post('/admin/home-banners', form);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-home-banners'] });
            closeEditor();
        },
        onError: (error) => setFormError(error.response?.data?.message || 'تعذر حفظ البانر'),
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => api.delete(`/admin/home-banners/${id}`),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-home-banners'] }),
    });

    const reorderMutation = useMutation({
        mutationFn: (items) => api.put('/admin/home-banners/reorder', { banners: items.map((item, index) => ({ id: item.id, sort_order: index })) }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-home-banners'] }),
    });

    const orderedBanners = useMemo(() => [...banners].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.id - b.id), [banners]);

    function closeEditor() {
        setEditing(null);
        setDraft(EMPTY_BANNER);
        setFile(null);
        setImagePreview('');
        setFormError('');
    }

    function openEditor(banner = null) {
        setEditing(banner);
        setDraft(banner ? {
            ...EMPTY_BANNER,
            ...banner,
            placement: banner.placement || 'top',
            // Keep the existing image unchanged unless the administrator explicitly
            // selects a new file or enters a replacement URL.
            image_url: '',
            starts_at: toInputDate(banner.starts_at),
            ends_at: toInputDate(banner.ends_at),
        } : { ...EMPTY_BANNER, sort_order: banners.length });
        setFile(null);
        setImagePreview(banner?.image_url ? storageUrl(banner.image_url) : '');
        setFormError('');
    }

    function updateDraft(key, value) {
        setDraft((current) => ({ ...current, [key]: value }));
    }

    function chooseFile(event) {
        const selected = event.target.files?.[0];
        if (!selected) return;
        setFile(selected);
        setImagePreview(URL.createObjectURL(selected));
    }

    function move(index, delta) {
        const next = [...orderedBanners];
        const target = index + delta;
        if (target < 0 || target >= next.length) return;
        [next[index], next[target]] = [next[target], next[index]];
        reorderMutation.mutate(next);
    }

    function submit(event) {
        event.preventDefault();
        if (!file && !draft.image_url && !draft.image && !editing) {
            setFormError('أضف صورة للبانر أو رابط صورة');
            return;
        }
        if (!draft.title_ar && !draft.title_en) {
            setFormError('أدخل عنواناً بالعربية أو الإنجليزية');
            return;
        }
        if (draft.link_type !== 'none' && !draft.link_url) {
            setFormError('أدخل الرابط عند تفعيل الزر');
            return;
        }
        setFormError('');
        saveMutation.mutate();
    }

    return (
        <div className="space-y-6 pb-10 text-right" dir="rtl">
            <header className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <LayoutPanelTop className="h-7 w-7 text-indigo-400" />
                    <div>
                        <h2 className="text-3xl font-extrabold text-white">بنرات الصفحة الرئيسية</h2>
                        <p className="mt-1 text-sm text-gray-500">تحكم كامل بالسلايدر الظاهر أعلى تطبيق العملاء</p>
                    </div>
                </div>
                <button onClick={() => openEditor()} className="btn-primary"><Plus className="h-4 w-4" /> إضافة بنر</button>
            </header>

            <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-4 text-sm leading-7 text-indigo-100/80">
                أضف صورة، نصاً بالعربية أو الإنجليزية، شارة، وزراً مع رابط. يمكن جدولة الظهور وتغيير ترتيب الشرائح من الأسهم.
            </div>

            {isLoading ? (
                <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-indigo-400" /></div>
            ) : orderedBanners.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 py-16 text-center text-gray-500">
                    <ImagePlus className="mx-auto mb-3 h-10 w-10 text-gray-600" />
                    لا توجد بنرات بعد
                </div>
            ) : (
                <div className="space-y-3">
                    {orderedBanners.map((banner, index) => {
                        const [label, badgeClass] = statusLabel(banner);
                        return (
                            <div key={banner.id} className="glass-card flex items-center gap-4 rounded-2xl border border-white/5 p-3">
                                <div className="flex shrink-0 flex-col gap-1">
                                    <button onClick={() => move(index, -1)} disabled={index === 0 || reorderMutation.isPending} className="rounded-lg p-1 text-gray-500 hover:bg-white/10 hover:text-white disabled:opacity-30"><ChevronUp className="h-4 w-4" /></button>
                                    <span className="text-center text-xs font-bold text-gray-500">{index + 1}</span>
                                    <button onClick={() => move(index, 1)} disabled={index === orderedBanners.length - 1 || reorderMutation.isPending} className="rounded-lg p-1 text-gray-500 hover:bg-white/10 hover:text-white disabled:opacity-30"><ChevronDown className="h-4 w-4" /></button>
                                </div>
                                <img src={storageUrl(banner.image_url || banner.image)} alt="" className="h-16 w-28 shrink-0 rounded-xl object-cover" style={{ objectPosition: banner.image_position || 'center' }} />
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h3 className="truncate font-bold text-white">{banner.title_ar || banner.title_en}</h3>
                                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${badgeClass}`}>{label}</span>
                                    </div>
                                    <p className="mt-1 truncate text-xs text-gray-500">{banner.title_en || banner.body_ar || 'بدون وصف'}</p>
                                </div>
                                <div className="hidden items-center gap-2 text-xs text-gray-500 md:flex">
                                    <CalendarClock className="h-4 w-4" />
                                    {banner.starts_at || banner.ends_at ? 'مجدول' : 'دائم'}
                                </div>
                                <div className="flex shrink-0 gap-1">
                                    <button onClick={() => openEditor(banner)} className="rounded-xl bg-white/5 p-2 text-gray-400 hover:text-indigo-300"><Pencil className="h-4 w-4" /></button>
                                    <button onClick={() => { if (window.confirm('حذف هذا البانر؟')) deleteMutation.mutate(banner.id); }} className="rounded-xl bg-red-500/10 p-2 text-red-300 hover:bg-red-500/20"><Trash2 className="h-4 w-4" /></button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {editing !== null || draft !== EMPTY_BANNER ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm" onClick={(event) => event.target === event.currentTarget && closeEditor()}>
                    <form onSubmit={submit} className="w-full max-w-5xl rounded-3xl border border-white/10 bg-[#0b1728] p-5 shadow-2xl" dir="rtl">
                        <div className="mb-5 flex items-center justify-between">
                            <div>
                                <h3 className="text-xl font-extrabold text-white">{editing ? 'تعديل البانر' : 'إضافة بنر جديد'}</h3>
                                <p className="mt-1 text-xs text-gray-500">المعاينة تعكس شكل السلايدر على الهاتف</p>
                            </div>
                            <button type="button" onClick={closeEditor} className="rounded-xl p-2 text-gray-400 hover:bg-white/10 hover:text-white"><X className="h-5 w-5" /></button>
                        </div>
                        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
                            <div className="space-y-3">
                                <Preview banner={draft} imagePreview={imagePreview} />
                                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-indigo-400/30 bg-indigo-500/5 px-4 py-3 text-sm font-bold text-indigo-200 hover:bg-indigo-500/10">
                                    <Upload className="h-4 w-4" /> رفع صورة
                                    <input type="file" accept="image/*" onChange={chooseFile} className="hidden" />
                                </label>
                                <Field label="أو رابط صورة بديلة" value={draft.image_url} onChange={(value) => updateDraft('image_url', value)} placeholder="https://..." dir="ltr" />
                                <div className="grid grid-cols-3 gap-2">
                                    {['left', 'center', 'right'].map((position) => (
                                        <button type="button" key={position} onClick={() => updateDraft('image_position', position)} className={`rounded-xl border px-2 py-2 text-xs ${draft.image_position === position ? 'border-indigo-400 bg-indigo-500/20 text-indigo-200' : 'border-white/10 text-gray-500'}`}>{position === 'left' ? 'يسار' : position === 'right' ? 'يمين' : 'وسط'}</button>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-5">
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <Field label="العنوان بالعربية *" value={draft.title_ar} onChange={(value) => updateDraft('title_ar', value)} />
                                    <Field label="العنوان بالإنجليزية" value={draft.title_en} onChange={(value) => updateDraft('title_en', value)} dir="ltr" />
                                    <TextAreaField label="الوصف بالعربية" value={draft.body_ar} onChange={(value) => updateDraft('body_ar', value)} />
                                    <TextAreaField label="الوصف بالإنجليزية" value={draft.body_en} onChange={(value) => updateDraft('body_en', value)} />
                                    <Field label="الشارة بالعربية" value={draft.badge_ar} onChange={(value) => updateDraft('badge_ar', value)} />
                                    <Field label="الشارة بالإنجليزية" value={draft.badge_en} onChange={(value) => updateDraft('badge_en', value)} dir="ltr" />
                                </div>
                                <div className="border-t border-white/10 pt-4">
                                    <h4 className="mb-3 font-bold text-white">موضع الظهور</h4>
                                    <select value={draft.placement} onChange={(event) => updateDraft('placement', event.target.value)} className="input-field">
                                        <option value="top">أعلى الصفحة الرئيسية</option>
                                        <option value="bottom">أسفل صفحة فئات المتاجر</option>
                                    </select>
                                </div>
                                <div className="border-t border-white/10 pt-4">
                                    <h4 className="mb-3 font-bold text-white">الإجراء</h4>
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <Field label="نص الزر بالعربية" value={draft.cta_label_ar} onChange={(value) => updateDraft('cta_label_ar', value)} />
                                        <Field label="نص الزر بالإنجليزية" value={draft.cta_label_en} onChange={(value) => updateDraft('cta_label_en', value)} dir="ltr" />
                                        <label className="block text-right">
                                            <span className="mb-1.5 block text-xs font-bold text-gray-400">نوع الرابط</span>
                                            <select value={draft.link_type} onChange={(event) => updateDraft('link_type', event.target.value)} className="input-field">
                                                <option value="none">بدون رابط</option>
                                                <option value="internal">داخل التطبيق</option>
                                                <option value="external">رابط خارجي</option>
                                            </select>
                                        </label>
                                        <Field label="الرابط" value={draft.link_url} onChange={(value) => updateDraft('link_url', value)} placeholder={draft.link_type === 'internal' ? '/(customer)/(tabs)/offers' : 'https://...'} dir="ltr" />
                                    </div>
                                </div>
                                <div className="border-t border-white/10 pt-4">
                                    <h4 className="mb-3 font-bold text-white">الظهور</h4>
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <Field label="يبدأ في" type="datetime-local" value={draft.starts_at} onChange={(value) => updateDraft('starts_at', value)} dir="ltr" />
                                        <Field label="ينتهي في" type="datetime-local" value={draft.ends_at} onChange={(value) => updateDraft('ends_at', value)} dir="ltr" />
                                    </div>
                                    <label className="mt-3 flex cursor-pointer items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm font-bold text-white">
                                        <span>{draft.is_active ? 'البانر مفعّل' : 'البانر غير مفعّل'}</span>
                                        <input type="checkbox" checked={Boolean(draft.is_active)} onChange={(event) => updateDraft('is_active', event.target.checked)} className="h-4 w-4 accent-indigo-500" />
                                    </label>
                                </div>
                            </div>
                        </div>
                        {formError && <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">{formError}</div>}
                        <div className="mt-6 flex gap-3">
                            <button type="submit" disabled={saveMutation.isPending} className="btn-primary flex-1">
                                {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} حفظ البانر
                            </button>
                            <button type="button" onClick={closeEditor} className="btn-secondary flex-1">إلغاء</button>
                        </div>
                    </form>
                </div>
            ) : null}
        </div>
    );
};

export default AdminHomeBanners;