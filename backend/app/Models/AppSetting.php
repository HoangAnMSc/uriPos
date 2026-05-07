<?php

namespace App\Models;

use App\Support\CustomerRankDefaults;
use Illuminate\Database\Eloquent\Model;

class AppSetting extends Model
{
    public const DEFAULTS = [
        'theme' => 'light',
        'logo_url' => '',
        'logo_text' => 'A',
        'brand_name' => 'APOS PANEL',
        'font_family' => 'Inter',
        'font_sizes' => [
            'h1' => 34,
            'h2' => 28,
            'h3' => 24,
            'h4' => 20,
            'h5' => 17,
            'h6' => 15,
        ],
        'sidebar_color' => 'dark',
        'sidebar_custom_from' => '#1C1C1E',
        'sidebar_custom_to' => '#2C2C2E',
        'sidebar_active_color' => '#16A34A',
        'accent_color' => '#16A34A',
        'border_radius' => 'md',
        'customer_rank_rules' => CustomerRankDefaults::RULES,
        'customer_point_exchange_amount' => CustomerRankDefaults::SPEND_AMOUNT_PER_POINT,
    ];

    protected $fillable = [
        'theme',
        'logo_url',
        'logo_text',
        'brand_name',
        'font_family',
        'font_sizes',
        'sidebar_color',
        'sidebar_custom_from',
        'sidebar_custom_to',
        'sidebar_active_color',
        'accent_color',
        'border_radius',
        'customer_rank_rules',
        'customer_point_exchange_amount',
    ];

    protected $casts = [
        'font_sizes' => 'array',
        'customer_rank_rules' => 'array',
        'customer_point_exchange_amount' => 'integer',
    ];

    public static function firstOrCreateSettings(): self
    {
        $setting = static::first();

        if ($setting) {
            return $setting;
        }

        return static::create(self::DEFAULTS);
    }
}
