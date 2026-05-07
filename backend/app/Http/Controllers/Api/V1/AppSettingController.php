<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\AppSetting;
use Illuminate\Http\Request;

class AppSettingController extends Controller
{
    public function show()
    {
        return response()->json([
            'data' => $this->firstOrCreateSettings(),
        ]);
    }

    public function update(Request $request)
    {
        $validated = $request->validate([
            'theme' => ['required', 'in:light,dark'],
            'logo_url' => ['nullable', 'string'],
            'logo_text' => ['nullable', 'string', 'max:3'],
            'brand_name' => ['required', 'string', 'max:120'],
            'font_family' => ['required', 'in:Inter,Quicksand,Outfit,Montserrat,system-ui'],
            'font_sizes' => ['required', 'array'],
            'font_sizes.h1' => ['required', 'integer', 'between:10,60'],
            'font_sizes.h2' => ['required', 'integer', 'between:10,60'],
            'font_sizes.h3' => ['required', 'integer', 'between:10,60'],
            'font_sizes.h4' => ['required', 'integer', 'between:10,60'],
            'font_sizes.h5' => ['required', 'integer', 'between:10,60'],
            'font_sizes.h6' => ['required', 'integer', 'between:10,60'],
            'sidebar_color' => ['required', 'in:dark,green,blue,purple,custom'],
            'sidebar_custom_from' => ['required', 'regex:/^#([A-Fa-f0-9]{6})$/'],
            'sidebar_custom_to' => ['required', 'regex:/^#([A-Fa-f0-9]{6})$/'],
            'sidebar_active_color' => ['required', 'regex:/^#([A-Fa-f0-9]{6})$/'],
            'accent_color' => ['required', 'regex:/^#([A-Fa-f0-9]{6})$/'],
            'border_radius' => ['required', 'in:sm,md,lg'],
        ]);

        $normalized = [
            'theme' => $validated['theme'],
            'logo_url' => trim((string) ($validated['logo_url'] ?? '')),
            'logo_text' => strtoupper(substr(trim((string) ($validated['logo_text'] ?? 'A')), 0, 3)),
            'brand_name' => trim($validated['brand_name']),
            'font_family' => $validated['font_family'],
            'font_sizes' => $validated['font_sizes'],
            'sidebar_color' => $validated['sidebar_color'],
            'sidebar_custom_from' => $this->normalizeHex($validated['sidebar_custom_from']),
            'sidebar_custom_to' => $this->normalizeHex($validated['sidebar_custom_to']),
            'sidebar_active_color' => $this->normalizeHex($validated['sidebar_active_color']),
            'accent_color' => $this->normalizeHex($validated['accent_color']),
            'border_radius' => $validated['border_radius'],
        ];

        $setting = $this->firstOrCreateSettings();
        $setting->update($normalized);

        return response()->json([
            'data' => $setting->fresh(),
        ]);
    }

    private function firstOrCreateSettings(): AppSetting
    {
        return AppSetting::firstOrCreateSettings();
    }

    private function normalizeHex(string $value): string
    {
        return strtoupper($value);
    }
}
