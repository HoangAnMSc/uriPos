<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\ContentField;
use App\Models\ContentStructure;
use App\Services\CloudinaryMediaService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ContentFieldController extends Controller
{
    private function allowedTypes(): array
    {
        return [
            'single_line',
            'single_line_ac',
            'multi_line',
            'wysiwyg',
            'html',
            'image',
            'single_choice',
            'multiple_choice',
            'date',
            'master_select',
            'master_checkbox',
            'number',
            'checkbox',
            'radio',
        ];
    }

    public function store(Request $request, $structureId)
    {
        $structure = ContentStructure::findOrFail($structureId);

        $payload = $request->validate([
            'name' => ['required', 'string', 'max:190'],
            'slug' => [
                'required',
                'string',
                'max:190',
                Rule::unique('content_fields', 'slug')->where(
                    fn ($q) => $q->where('content_structure_id', $structure->id)
                ),
            ],
            'type' => ['required', 'string', Rule::in($this->allowedTypes())],
            'required' => ['sometimes', 'boolean'],
            'is_unique' => ['sometimes', 'boolean'],
            'hint' => ['nullable', 'string', 'max:255'],
            'options' => ['nullable', 'array'],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
        ]);

        $payload['content_structure_id'] = $structure->id;

        if (!in_array($payload['type'], ['single_choice', 'multiple_choice'], true)) {
            $payload['options'] = null;
        }

        $field = ContentField::create($payload);

        return response()->json([
            'data' => $field,
        ], 201);
    }

    public function update(Request $request, $structureId, $fieldId)
    {
        $structure = ContentStructure::findOrFail($structureId);

        $field = ContentField::query()
            ->where('content_structure_id', $structure->id)
            ->findOrFail($fieldId);

        $payload = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:190'],
            'slug' => [
                'sometimes',
                'required',
                'string',
                'max:190',
                Rule::unique('content_fields', 'slug')
                    ->where(fn ($q) => $q->where('content_structure_id', $structure->id))
                    ->ignore($field->id),
            ],
            'type' => ['sometimes', 'required', 'string', Rule::in($this->allowedTypes())],
            'required' => ['sometimes', 'boolean'],
            'is_unique' => ['sometimes', 'boolean'],
            'hint' => ['nullable', 'string', 'max:255'],
            'options' => ['nullable', 'array'],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
        ]);

        if (isset($payload['type']) && !in_array($payload['type'], ['single_choice', 'multiple_choice'], true)) {
            $payload['options'] = null;
        }

        $field->update($payload);

        return response()->json([
            'data' => $field,
        ]);
    }

    public function uploadImage(Request $request, CloudinaryMediaService $cloudinaryMedia)
    {
        $request->validate([
            'image' => ['required', 'image', 'max:4096'],
        ]);

        $result = $cloudinaryMedia->uploadImage(
            $request->file('image'),
            'apos/content-fields',
        );

        return response()->json([
            'message' => 'Upload success',
            'url' => $result['secure_url'],
        ]);
    }

    public function destroy($structureId, $fieldId)
    {
        $structure = ContentStructure::findOrFail($structureId);

        $field = ContentField::query()
            ->where('content_structure_id', $structure->id)
            ->findOrFail($fieldId);

        $field->delete();

        return response()->json([
            'message' => 'Deleted',
        ]);
    }

    public function reorder(Request $request, $structureId)
    {
        $structure = ContentStructure::findOrFail($structureId);

        $payload = $request->validate([
            'orders' => ['required', 'array'],
            'orders.*.id' => ['required', 'integer'],
            'orders.*.sort_order' => ['required', 'integer', 'min:0'],
        ]);

        $ids = collect($payload['orders'])->pluck('id')->all();

        $fields = ContentField::query()
            ->where('content_structure_id', $structure->id)
            ->whereIn('id', $ids)
            ->get()
            ->keyBy('id');

        foreach ($payload['orders'] as $row) {
            $field = $fields->get($row['id']);

            if ($field) {
                $field->sort_order = (int) $row['sort_order'];
                $field->save();
            }
        }

        return response()->json([
            'message' => 'OK',
        ]);
    }
}
