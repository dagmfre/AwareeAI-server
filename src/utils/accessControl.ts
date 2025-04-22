import { Request, Response, NextFunction } from 'express';
import User from '../models/User';
import SharedDoc from '../models/SharedDoc';

// Check if the user has access to a document
export const hasAccessToDocument = async (req: Request, res: Response, next: NextFunction) => {
    const { documentId } = req.params;
    const userId = req?.user?._id;

    // Check if the document is owned by the user
    const user = await User.findById(userId);
    if (user.r2rDocumentIds.includes(documentId)) {
        return next();
    }

    // Check if the document is shared with the user
    const sharedDoc = await SharedDoc.findOne({
        r2rDocumentId: documentId,
        $or: [
            { isPublic: true },
            { sharedWith: userId },
            { originalOwner: userId }
        ]
    });

    if (sharedDoc) {
        return next();
    }

    return res.status(403).json({ message: 'Access denied to this document' });
};

// Check if the user has access to a shared document
export const canShareDocument = async (req: Request, res: Response, next: NextFunction) => {
    const { documentId } = req.body;
    const userId = req?.user?._id;

    // Verify that the user owns this document
    const user = await User.findById(userId);
    if (!user.r2rDocumentIds.includes(documentId)) {
        return res.status(403).json({ message: 'You can only share documents you own' });
    }

    next();
};