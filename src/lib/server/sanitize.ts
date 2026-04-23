import sanitizeHtml from 'sanitize-html';

const ALLOWED_TAGS = [
	'a', 'b', 'i', 'em', 'strong', 'p', 'br', 'hr',
	'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
	'ul', 'ol', 'li', 'blockquote', 'pre', 'code',
	'img', 'figure', 'figcaption',
	'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
	'div', 'span', 'section', 'article', 'aside', 'header', 'footer', 'main',
	's', 'del', 'ins', 'sub', 'sup', 'mark', 'abbr', 'cite', 'q', 'time',
	'dl', 'dt', 'dd',
];

const ALLOWED_SCHEMES = ['http', 'https'];

export function sanitizeContent(html: string): string {
	return sanitizeHtml(html, {
		allowedTags: ALLOWED_TAGS,
		allowedAttributes: {
			'a': ['href', 'title', 'rel'],
			'img': ['src', 'alt', 'title', 'width', 'height', 'loading'],
			'td': ['colspan', 'rowspan'],
			'th': ['colspan', 'rowspan', 'scope'],
			'time': ['datetime'],
			'abbr': ['title'],
			'q': ['cite'],
			'blockquote': ['cite'],
			'ol': ['start', 'type'],
			'li': ['value'],
			// Allow id/class on structural elements for reader styling
			'*': ['id'],
		},
		allowedSchemes: ALLOWED_SCHEMES,
		allowedSchemesByTag: {
			img: ALLOWED_SCHEMES,
			a: ALLOWED_SCHEMES,
		},
		// Strip data: and javascript: URIs from all attributes
		allowedSchemesAppliedToAttributes: ['href', 'src', 'cite', 'action'],
		// Don't allow self-closing non-void tags to become injection vectors
		selfClosing: ['img', 'br', 'hr'],
		// Discard the tag but keep its text content for unknown tags
		nonTextTags: ['script', 'style', 'textarea', 'noscript'],
	});
}
