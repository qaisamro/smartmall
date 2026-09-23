<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HomeBanner extends Model
{
    protected $fillable = [
        'image',
        'image_position',
        'placement',
        'title_ar',
        'title_en',
        'body_ar',
        'body_en',
        'badge_ar',
        'badge_en',
        'cta_label_ar',
        'cta_label_en',
        'link_type',
        'link_url',
        'is_active',
        'starts_at',
        'ends_at',
        'sort_order',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'starts_at' => 'datetime',
        'ends_at' => 'datetime',
        'sort_order' => 'integer',
    ];
}