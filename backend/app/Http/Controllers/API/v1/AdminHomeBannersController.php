<?php

namespace App\Http\Controllers\API\v1;

use App\Http\Controllers\Controller;
use App\Models\HomeBanner;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class AdminHomeBannersController extends Controller
{
    private function rules(bool $update = false): array
    {
        return [
            'image' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:8192',
            'image_url' => 'nullable|url|max:2048',
            'image_position' => 'nullable|string|max:50',
            'placement' => 'nullable|in:top,bottom',
            'title_ar' => 'nullable|string|max:255',
            'title_en' => 'nullable|string|max:255',
            'body_ar' => 'nullable|string',
            'body_en' => 'nullable|string',
            'badge_ar' => 'nullable|string|max:100',
            'badge_en' => 'nullable|string|max:100',
            'cta_label_ar' => 'nullable|string|max:100',
            'cta_label_en' => 'nullable|string|max:100',
            'link_type' => 'nullable|in:none,internal,external',
            'link_url' => 'nullable|string|max:2048',
            'is_active' => 'nullable|in:true,false,1,0,on,off,yes,no',
            'starts_at' => 'nullable|date',
            'ends_at' => 'nullable|date|after_or_equal:starts_at',
            'sort_order' => 'nullable|integer|min:0',
        ];
    }

    private function normalizeData(Request $request, array $data, ?HomeBanner $banner = null): array
    {
        $data['is_active'] = in_array($data['is_active'] ?? true, ['true', '1', 'on', 'yes', true, 1], true);
        $data['link_type'] = $data['link_type'] ?? 'none';
        $data['image_position'] = $data['image_position'] ?? 'center';
        $data['placement'] = $data['placement'] ?? 'top';

        if ($request->hasFile('image')) {
            if ($banner?->image && !filter_var($banner->image, FILTER_VALIDATE_URL)) {
                Storage::disk('public')->delete($banner->image);
            }
            $data['image'] = $request->file('image')->store('home-banners', 'public');
        } elseif (!empty($data['image_url'])) {
            $data['image'] = $data['image_url'];
        } elseif ($banner) {
            unset($data['image']);
        }

        unset($data['image_url']);
        return $data;
    }

    private function serialize(HomeBanner $banner): array
    {
        $data = $banner->toArray();
        $data['image_url'] = $banner->image
            ? (filter_var($banner->image, FILTER_VALIDATE_URL) ? $banner->image : Storage::url($banner->image))
            : null;
        return $data;
    }

    public function index()
    {
        return response()->json(HomeBanner::orderBy('sort_order')->orderBy('id')->get()->map(fn ($banner) => $this->serialize($banner))->values());
    }

    public function store(Request $request)
    {
        $validated = $request->validate($this->rules());
        if (!$request->hasFile('image') && empty($validated['image_url'])) {
            return response()->json(['message' => 'أضف صورة للبانر أو رابط صورة'], 422);
        }
        $data = $this->normalizeData($request, $validated);
        if (!empty($data['title_ar']) || !empty($data['title_en'])) {
            $banner = HomeBanner::create($data);
            return response()->json($this->serialize($banner), 201);
        }

        return response()->json(['message' => 'أدخل عنواناً واحداً على الأقل'], 422);
    }

    public function update(Request $request, int $id)
    {
        $banner = HomeBanner::findOrFail($id);
        $data = $this->normalizeData($request, $request->validate($this->rules(true)), $banner);
        if (empty($data['title_ar']) && empty($data['title_en']) && !$banner->title_ar && !$banner->title_en) {
            return response()->json(['message' => 'أدخل عنواناً واحداً على الأقل'], 422);
        }
        $banner->update($data);
        return response()->json($this->serialize($banner));
    }

    public function destroy(int $id)
    {
        $banner = HomeBanner::findOrFail($id);
        if ($banner->image && !filter_var($banner->image, FILTER_VALIDATE_URL)) {
            Storage::disk('public')->delete($banner->image);
        }
        $banner->delete();
        return response()->json(['message' => 'تم حذف البانر']);
    }

    public function reorder(Request $request)
    {
        $items = $request->validate([
            'banners' => 'required|array',
            'banners.*.id' => 'required|integer|exists:home_banners,id',
            'banners.*.sort_order' => 'required|integer|min:0',
        ])['banners'];

        foreach ($items as $item) {
            HomeBanner::whereKey($item['id'])->update(['sort_order' => $item['sort_order']]);
        }

        return response()->json(['message' => 'تم حفظ ترتيب البانرات']);
    }

    public function publicBanners(Request $request)
    {
        $now = now();
        $placement = $request->query('placement', 'top');
        if (!in_array($placement, ['top', 'bottom'], true)) {
            $placement = 'top';
        }

        $banners = HomeBanner::where('placement', $placement)
            ->where('is_active', true)
            ->where(function ($query) use ($now) {
                $query->whereNull('starts_at')->orWhere('starts_at', '<=', $now);
            })
            ->where(function ($query) use ($now) {
                $query->whereNull('ends_at')->orWhere('ends_at', '>=', $now);
            })
            ->where(function ($query) {
                $query->whereNotNull('title_ar')
                    ->orWhereNotNull('title_en');
            })
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get()
            ->map(fn ($banner) => $this->serialize($banner))
            ->values();

        return response()->json($banners);
    }
}