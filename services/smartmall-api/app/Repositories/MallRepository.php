<?php

namespace App\Repositories;

use App\Models\Mall;

class MallRepository extends BaseRepository
{
    public function __construct(Mall $model)
    {
        parent::__construct($model);
    }

    public function getActiveMalls(string $search = null, ?string $type = null)
    {
        // تشمل المنشآت المعطلة (is_active=false) لتظهر في التصفح مع مودال "معلق مؤقتاً" — الفرونت يمنع الدخول
        $query = $this->model->with('theme')->where('status', 'approved');

        if ($type && $type !== 'all') {
            if (in_array($type, ['mall', 'supermarket'], true)) {
                $query->where('type', $type);
            } elseif (in_array($type, ['grocery', 'butcher'], true)) {
                // Grocery and butcher stores are represented as supermarket rows
                // for compatibility with the existing database enum. The model
                // accessor decodes the approved type metadata after retrieval.
                $query->where('type', 'supermarket');
            }
        }

        if ($search) {
            $query->where(function ($query) use ($search) {
                $query->where('name_ar', 'LIKE', "%{$search}%")
                    ->orWhere('name_en', 'LIKE', "%{$search}%")
                    ->orWhere('slug', 'LIKE', "%{$search}%")
                    ->orWhere('location_arabic', 'LIKE', "%{$search}%");
            });
        }

        $malls = $query->orderByDesc('is_active')->get();
        if (in_array($type, ['grocery', 'butcher'], true)) {
            $malls = $malls->filter(fn (Mall $mall) => $mall->type === $type)->values();
        }

        return $malls;
    }

    public function getByOwner($ownerId)
    {
        return $this->model->with('theme')->where('owner_id', $ownerId)->get();
    }
}
