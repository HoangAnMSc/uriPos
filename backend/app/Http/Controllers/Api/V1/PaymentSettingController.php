<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\PaymentSetting;
use Illuminate\Http\Request;

class PaymentSettingController extends Controller
{
    public function show()
    {
        $setting = PaymentSetting::first();

        if (!$setting) {
            $setting = PaymentSetting::create([]);
        }

        return response()->json([
            'data' => $setting
        ]);
    }

    public function update(Request $request)
    {
        $data = $request->validate([
            'bank_name' => ['nullable','string','max:255'],
            'account_name' => ['nullable','string','max:255'],
            'account_number' => ['nullable','string','max:255'],
            'qr_image' => ['nullable','string','max:500'],
        ]);

        $setting = PaymentSetting::first();

        if (!$setting) {
            $setting = PaymentSetting::create($data);
        } else {
            $setting->update($data);
        }

        return response()->json([
            'data' => $setting
        ]);
    }
}