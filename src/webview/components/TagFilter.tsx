import React, { useState, useRef } from 'react';
import { Project, Tag, TAG_COLORS } from '../../types';

interface TagFilterProps {
  tags: Tag[];
  projects: Project[];
  draggedProjectId: string | null;
  selectedTag: string | null;
  onSelectTag: (tagId: string | null) => void;
  onAddTag: (name: string, color: string) => void;
  onUpdateTag: (tag: Tag) => void;
  onDeleteTag: (tagId: string) => void;
  onReorderTags: (tags: Tag[]) => void;
  onDropProject?: (projectId: string, tagId: string) => void;
  onRemoveProjectFromTag?: (projectId: string, tagId: string) => void;
}

export default function TagFilter({ tags, projects, draggedProjectId, selectedTag, onSelectTag, onAddTag, onUpdateTag, onDeleteTag, onReorderTags, onDropProject, onRemoveProjectFromTag }: TagFilterProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [selectedColor, setSelectedColor] = useState(TAG_COLORS[0]);
  const [customColor, setCustomColor] = useState('');
  const [showCustomColor, setShowCustomColor] = useState(false);
  const [draggedTag, setDraggedTag] = useState<string | null>(null);
  const [dragOverTag, setDragOverTag] = useState<string | null>(null);
  const [dragOverAction, setDragOverAction] = useState<'add' | 'remove'>('add');
  const dragOverTagRef = useRef<string | null>(null);
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editTagName, setEditTagName] = useState('');
  const [editTagColor, setEditTagColor] = useState('');
  const [editShowCustomColor, setEditShowCustomColor] = useState(false);

  const handleAddTag = () => {
    const color = showCustomColor && customColor ? customColor : selectedColor;
    if (newTagName.trim()) {
      onAddTag(newTagName.trim(), color);
      setNewTagName('');
      setShowAddForm(false);
      setCustomColor('');
      setShowCustomColor(false);
    }
  };

  const handleDragStart = (tagId: string) => {
    setDraggedTag(tagId);
  };

  const handleDragOver = (e: React.DragEvent, tagId: string) => {
    e.preventDefault();
    dragOverTagRef.current = tagId;
    setDragOverTag(tagId);

    if (draggedProjectId) {
      const project = projects.find(p => p.id === draggedProjectId);
      if (project && project.tags.includes(tagId)) {
        setDragOverAction('remove');
      } else {
        setDragOverAction('add');
      }
    }
  };

  const handleDragLeave = () => {
    setDragOverTag(null);
    setDragOverAction('add');
  };

  const handleDrop = (e: React.DragEvent, targetTagId: string) => {
    e.preventDefault();
    const data = e.dataTransfer.getData('project');

    if (data && onDropProject) {
      const project = projects.find(p => p.id === data);
      if (project && project.tags.includes(targetTagId) && onRemoveProjectFromTag) {
        onRemoveProjectFromTag(data, targetTagId);
      } else {
        onDropProject(data, targetTagId);
      }
    } else if (draggedTag && draggedTag !== targetTagId) {
      const newTags = [...tags];
      const draggedIndex = newTags.findIndex(t => t.id === draggedTag);
      const targetIndex = newTags.findIndex(t => t.id === targetTagId);

      if (draggedIndex !== -1 && targetIndex !== -1) {
        const [removed] = newTags.splice(draggedIndex, 1);
        newTags.splice(targetIndex, 0, removed);
        newTags.forEach((tag, index) => {
          tag.order = index;
        });
        onReorderTags(newTags);
      }
    }
    setDraggedTag(null);
    setDragOverTag(null);
    setDragOverAction('add');
    dragOverTagRef.current = null;
  };

  const isValidColor = (color: string) => {
    return /^#[0-9A-Fa-f]{6}$/.test(color);
  };

  const startEditTag = (tag: Tag) => {
    setEditingTagId(tag.id);
    setEditTagName(tag.name);
    setEditTagColor(tag.color);
    setEditShowCustomColor(!TAG_COLORS.includes(tag.color));
  };

  const cancelEditTag = () => {
    setEditingTagId(null);
    setEditTagName('');
    setEditTagColor('');
    setEditShowCustomColor(false);
  };

  const saveEditTag = () => {
    const tag = tags.find(t => t.id === editingTagId);
    if (!tag || !editTagName.trim()) return;
    const color = editShowCustomColor && editTagColor && isValidColor(editTagColor) ? editTagColor : editTagColor;
    onUpdateTag({ ...tag, name: editTagName.trim(), color });
    cancelEditTag();
  };

  return (
    <div className="tag-filter">
      <div className="tag-list">
        <button
          className={`tag-btn ${selectedTag === null ? 'active' : ''}`}
          onClick={() => onSelectTag(null)}
        >
          All
        </button>
        {tags.map(tag => (
          <div
            key={tag.id}
            className={`tag-wrapper ${dragOverTag === tag.id ? (dragOverAction === 'remove' ? 'drag-over-remove' : 'drag-over') : ''}`}
            draggable
            onDragStart={() => handleDragStart(tag.id)}
            onDragOver={(e) => handleDragOver(e, tag.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, tag.id)}
            data-tip={dragOverTag === tag.id
              ? (dragOverAction === 'remove' ? `Remove from "${tag.name}"` : `Add to "${tag.name}"`)
              : `Drop project here to tag as "${tag.name}"`
            }
          >
            {editingTagId === tag.id ? (
              <div className="tag-edit-form">
                <input
                  type="text"
                  className="tag-input"
                  value={editTagName}
                  onChange={(e) => setEditTagName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && saveEditTag()}
                  autoFocus
                />
                <div className="color-picker">
                  {TAG_COLORS.map(color => (
                    <button
                      key={color}
                      className={`color-option ${editTagColor === color && !editShowCustomColor ? 'selected' : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => {
                        setEditTagColor(color);
                        setEditShowCustomColor(false);
                      }}
                    />
                  ))}
                  <button
                    className={`color-option custom ${editShowCustomColor ? 'selected' : ''}`}
                    onClick={() => setEditShowCustomColor(!editShowCustomColor)}
                  >
                    +
                  </button>
                </div>
                {editShowCustomColor && (
                  <input
                    type="text"
                    className="tag-input"
                    placeholder="#FF6B6B"
                    value={editTagColor}
                    onChange={(e) => setEditTagColor(e.target.value)}
                    maxLength={7}
                  />
                )}
                <div className="tag-form-actions">
                  <button className="btn-primary" onClick={saveEditTag}>Save</button>
                  <button className="btn-secondary" onClick={cancelEditTag}>Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <button
                  className={`tag-btn ${selectedTag === tag.id ? 'active' : ''}`}
                  style={{
                    borderColor: tag.color,
                    backgroundColor: selectedTag === tag.id ? tag.color : 'transparent'
                  }}
                  onClick={() => onSelectTag(tag.id)}
                >
                  <span
                    className="tag-dot"
                    style={{ backgroundColor: tag.color }}
                  />
                  {tag.name}
                </button>
                {dragOverTag === tag.id && (
                  <span className={`tag-drop-hint ${dragOverAction}`}>
                    {dragOverAction === 'remove' ? '✕ Remove' : '✓ Add'}
                  </span>
                )}
                <button
                  className="tag-edit"
                  onClick={(e) => {
                    e.stopPropagation();
                    startEditTag(tag);
                  }}
                  data-tip={`Edit tag "${tag.name}"`}
                >
                  <svg viewBox="0 0 16 16" fill="currentColor">
                    <path d="M11.013 1.427a1.75 1.75 0 012.474 0l1.086 1.086a1.75 1.75 0 010 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 01-.927-.928l.929-3.25c.081-.286.235-.547.445-.756l8.61-8.61zm1.414 1.06a.25.25 0 00-.354 0L10.811 3.75l1.439 1.44 1.263-1.263a.25.25 0 000-.354l-1.086-1.086zM11.189 6.25L9.75 4.81l-6.286 6.287a.25.25 0 00-.067.108l-.97 3.394 3.394-.97a.249.249 0 00.108-.067L11.189 6.25z"/>
                  </svg>
                </button>
                <button
                  className="tag-delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteTag(tag.id);
                  }}
                  data-tip={`Delete tag "${tag.name}"`}
                >
                  <svg viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 0C3.58 0 0 3.58 0 8C0 12.42 3.58 16 8 16C12.42 16 16 12.42 16 8C16 3.58 12.42 0 8 0ZM11.71 10.29L10.29 11.71L8 9.41L5.71 11.71L4.29 10.29L6.59 8L4.29 5.71L5.71 4.29L8 6.59L10.29 4.29L11.71 5.71L9.41 8L11.71 10.29Z"/>
                  </svg>
                </button>
              </>
            )}
          </div>
        ))}
        <button className="tag-btn add-tag" onClick={() => setShowAddForm(!showAddForm)} data-tip="Add new tag">
          + Tag
        </button>
      </div>

      {showAddForm && (
        <div className="tag-form">
          <input
            type="text"
            className="tag-input"
            placeholder="Tag name"
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
            autoFocus
          />
          <div className="color-picker">
            {TAG_COLORS.map(color => (
              <button
                key={color}
                className={`color-option ${selectedColor === color && !showCustomColor ? 'selected' : ''}`}
                style={{ backgroundColor: color }}
                onClick={() => {
                  setSelectedColor(color);
                  setShowCustomColor(false);
                }}
                data-tip={color}
              />
            ))}
            <button
              className={`color-option custom ${showCustomColor ? 'selected' : ''}`}
              onClick={() => setShowCustomColor(!showCustomColor)}
              data-tip="Custom color"
            >
              +
            </button>
          </div>
          {showCustomColor && (
            <div className="custom-color-input">
              <input
                type="text"
                className="tag-input"
                placeholder="#FF6B6B"
                value={customColor}
                onChange={(e) => setCustomColor(e.target.value)}
                maxLength={7}
              />
              {customColor && !isValidColor(customColor) && (
                <span className="color-error">Invalid color format</span>
              )}
            </div>
          )}
          <div className="tag-form-actions">
            <button className="btn-primary" onClick={handleAddTag}>Add</button>
            <button className="btn-secondary" onClick={() => setShowAddForm(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
