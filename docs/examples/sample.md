# GFM Feature Showcase

A comprehensive sample demonstrating all 10 GFM feature areas.

## 1. Headings and Paragraphs

This is a simple paragraph with multiple sentences.

### Heading Level 3

Some more text here.

#### Heading Level 4

##### Heading Level 5

###### Heading Level 6

## 2. Inline Formatting

Text with **bold**, *italic*, ~~strikethrough~~, and `inline code`.

Combined: **bold *italic* text** with `code` mixed in.

## 3. Links and Images

Check out [Google](https://www.google.com) and [GitHub](https://github.com).

An image: ![alt text](https://via.placeholder.com/100)

## 4. Ordered Lists

1. First item
2. Second item
3. Third item

Nested:
1. Item one
   1. Sub-item 1.1
   2. Sub-item 1.2
2. Item two

## 5. Unordered Lists

- Apple
- Banana
- Cherry

Nested:
- Fruits
  - Red fruits
  - Yellow fruits
- Vegetables

## 6. Code Blocks

```javascript
function hello() {
  console.log("Hello, World!");
}
```

```python
def greet():
    print("Hello, Python!")
```

## 7. Blockquotes

> This is a simple blockquote.

> This is a blockquote with **bold** and *italic*.
> > Nested blockquote level 2
> > > Nested blockquote level 3

## 8. Tables

| Feature | Status | Notes |
|:--------|:------:|------:|
| Bold | ✓ | Supported |
| *Italic* | ✓ | Supported |
| `Code` | ✓ | Supported |

## 9. Task Lists

- [x] Completed task
- [ ] Incomplete task
- [x] Another done task
- [ ] Yet another to do

## 10. Auto-linked URLs and Horizontal Rules

Visit https://example.com or https://github.com for more information.

---

Mixed example: https://www.w3.org is a great resource.

---

## Edge Cases

Empty code: `` ` ``

XSS attempt: `<script>alert('xss')</script>` (should be escaped)

Ampersands: A & B & C

Quote in text: He said "hello".
