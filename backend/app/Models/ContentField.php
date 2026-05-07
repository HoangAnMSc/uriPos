<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ContentField extends Model
{
    protected $fillable = [
        'content_structure_id',
        'name',
        'slug',
        'type',
        'required',
        'is_unique',
        'hint',
        'options',
        'sort_order',
    ];

    protected $casts = [
        'required' => 'boolean',
        'is_unique' => 'boolean',
        'options' => 'array',
        'sort_order' => 'integer',
    ];

    public function structure(): BelongsTo
    {
        return $this->belongsTo(ContentStructure::class, 'content_structure_id');
    }

    public function values()
    {
        return $this->hasMany(ProductFieldValue::class);
    }
}