<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\ContentStructure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Validation\Rule;

class ContentStructureController extends Controller
{
    public function index()
    {
        $data = Cache::remember('content_structures.all', 120, function () {
            return ContentStructure::query()
                ->with(['fields'])
                ->orderByDesc('id')
                ->get();
        });

        return response()->json([
            'data' => $data
        ]);
    }

    public function store(Request $request)
    {
        $payload = $request->validate([
            'name' => ['required', 'string', 'max:190'],
            'slug' => ['required', 'string', 'max:190', 'unique:content_structures,slug'],
        ]);

        $structure = ContentStructure::create($payload);
        Cache::forget('content_structures.all');

        return response()->json([
            'data' => $structure->load('fields')
        ], 201);
    }

    public function show($id)
    {
        $structure = ContentStructure::query()
            ->with('fields')
            ->findOrFail($id);

        return response()->json([
            'data' => $structure
        ]);
    }

    public function update(Request $request, $id)
    {
        $structure = ContentStructure::findOrFail($id);

        $payload = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:190'],
            'slug' => [
                'sometimes',
                'required',
                'string',
                'max:190',
                Rule::unique('content_structures', 'slug')->ignore($structure->id),
            ],
        ]);

        $structure->update($payload);
        Cache::forget('content_structures.all');

        return response()->json([
            'data' => $structure->load('fields')
        ]);
    }

    public function destroy($id)
    {
        $structure = ContentStructure::findOrFail($id);
        $structure->delete();
        Cache::forget('content_structures.all');

        return response()->json([
            'message' => 'Deleted'
        ]);
    }
}