import React, { useState, useRef, useEffect, memo } from 'react';
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

function TagFilter({
  tags,
  projects,
  draggedProjectId,
  selectedTag,
  onSelectTag,
  onAddTag,
  onUpdateTag,
  onDeleteTag,
  onReorderTags,
  onDropProject,
  onRemoveProjectFromTag,
}: TagFilterProps) {
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
  const [menuTagId, setMenuTagId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuTagId) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuTagId(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuTagId]);

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
      const project = projects.find((p) => p.id === draggedProjectId);
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
      const project = projects.find((p) => p.id === data);
      if (project && project.tags.includes(targetTagId) && onRemoveProjectFromTag) {
        onRemoveProjectFromTag(data, targetTagId);
      } else {
        onDropProject(data, targetTagId);
      }
    } else if (draggedTag && draggedTag !== targetTagId) {
      const newTags = [...tags];
      const draggedIndex = newTags.findIndex((t) => t.id === draggedTag);
      const targetIndex = newTags.findIndex((t) => t.id === targetTagId);

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
    setMenuTagId(null);
  };

  const cancelEditTag = () => {
    setEditingTagId(null);
    setEditTagName('');
    setEditTagColor('');
    setEditShowCustomColor(false);
  };

  const saveEditTag = () => {
    const tag = tags.find((t) => t.id === editingTagId);
    if (!tag || !editTagName.trim()) return;
    const color =
      editShowCustomColor && editTagColor && isValidColor(editTagColor)
        ? editTagColor
        : editTagColor;
    onUpdateTag({ ...tag, name: editTagName.trim(), color });
    cancelEditTag();
  };

  const handleTagClick = (tagId: string) => {
    if (editingTagId === tagId) return;
    onSelectTag(tagId);
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
        {tags.map((tag) => (
          <div
            key={tag.id}
            className={`tag-wrapper ${dragOverTag === tag.id ? (dragOverAction === 'remove' ? 'drag-over-remove' : 'drag-over') : ''}`}
            draggable
            onDragStart={() => handleDragStart(tag.id)}
            onDragOver={(e) => handleDragOver(e, tag.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, tag.id)}
            data-tip={
              dragOverTag === tag.id
                ? dragOverAction === 'remove'
                  ? `Remove from "${tag.name}"`
                  : `Add to "${tag.name}"`
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
                  {TAG_COLORS.map((color) => (
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
                  <button className="btn-primary" onClick={saveEditTag}>
                    Save
                  </button>
                  <button className="btn-secondary" onClick={cancelEditTag}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <button
                  className={`tag-btn ${selectedTag === tag.id ? 'active' : ''}`}
                  style={{
                    borderColor: tag.color,
                    backgroundColor: selectedTag === tag.id ? tag.color : 'transparent',
                  }}
                  onClick={() => handleTagClick(tag.id)}
                >
                  <span className="tag-dot" style={{ backgroundColor: tag.color }} />
                  {tag.name}
                  <span
                    className="tag-menu-trigger"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuTagId(menuTagId === tag.id ? null : tag.id);
                    }}
                    data-tip={`Options for "${tag.name}"`}
                  >
                    <svg viewBox="0 0 16 16" fill="currentColor">
                      <path d="M8 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm0 3a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm0-6a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" />
                    </svg>
                  </span>
                </button>
                {dragOverTag === tag.id && (
                  <span className={`tag-drop-hint ${dragOverAction}`}>
                    {dragOverAction === 'remove' ? '✕ Remove' : '✓ Add'}
                  </span>
                )}
                {menuTagId === tag.id && (
                  <div className="tag-menu" ref={menuRef}>
                    <button
                      className="tag-menu-item"
                      onClick={(e) => {
                        e.stopPropagation();
                        startEditTag(tag);
                      }}
                    >
                      <svg viewBox="0 0 16 16" fill="currentColor">
                        <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z" />
                      </svg>
                      Edit
                    </button>
                    <button
                      className="tag-menu-item danger"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuTagId(null);
                        onDeleteTag(tag.id);
                      }}
                    >
                      <svg viewBox="0 0 16 16" fill="currentColor">
                        <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z" />
                        <path
                          fillRule="evenodd"
                          d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"
                        />
                      </svg>
                      Delete
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        ))}
        <button
          className="tag-btn add-tag"
          onClick={() => setShowAddForm(!showAddForm)}
          data-tip="Add new tag"
        >
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
            {TAG_COLORS.map((color) => (
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
            <button className="btn-primary" onClick={handleAddTag}>
              Add
            </button>
            <button className="btn-secondary" onClick={() => setShowAddForm(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(TagFilter);
