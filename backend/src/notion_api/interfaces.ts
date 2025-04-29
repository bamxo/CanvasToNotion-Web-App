export interface DatabaseObject{
    parent: {
        type: "page_id";
        page_id: string;
    };
    title: Array<{
        type: "text";
        text: {
        content: string;
        };
    }>;
    properties: {
        Name: {
        title: Record<string, unknown>;
        };
    };
}

export interface PageObject{
    parent: {
        type: "database_id";
        page_id: string;
    };

    properties: {
        Name: {
            title: Array<{
                text:{
                    content: string;
                    };
            }>;
        };
    };
    children: Array<{
        object: "block",
        heading_2: {
            rich_text: Array<{
                text: {
                    content: string;
                };
            }>;
        };
    }>;    
};


export interface BlockObject {
    parent: {
        type: "page_id";
        page_id: string;
    };
    rich_text: Array<{
        text: {
            content: string;
        };
    }>;
};

export interface StorageObject {
    auth_code: string;
};