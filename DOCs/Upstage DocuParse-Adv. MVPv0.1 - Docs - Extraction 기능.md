

---

## [Universal information extraction](https://console.upstage.ai/docs/capabilities/extract/universal-extraction#universal-information-extraction)

### [What is universal information extraction?](https://console.upstage.ai/docs/capabilities/extract/universal-extraction#what-is-universal-information-extraction)

Universal information extraction is a capability that enables [key information extraction](https://console.upstage.ai/docs/capabilities/information-extraction) from any document type. Unlike [prebuilt information extraction](https://console.upstage.ai/docs/capabilities/information-extraction/prebuilt-information-extraction), which requires fine-tuning for specific document types, universal information extraction can process and extract key information from any random document without additional training or customization.

### [Why use Upstage Information Extract?](https://console.upstage.ai/docs/capabilities/extract/universal-extraction#why-use-upstage-information-extract)

- **Works with any document type**: Supports complex PDFs, scanned images, and Microsoft Office documents, ensuring seamless data extraction across various formats.
- **Schema-agnostic processing**: Can dynamically process and generate structured outputs based on any given schema, enabling on-demand customization for different use cases.
- **Extracts hidden and implied information**: Can extract not only explicitly stated information but also implied or inferred values, such as determining the total amount from multiple line items or identifying key details that aren’t directly labeled in the document.
- **No fine-tuning required**: Extracts relevant data without predefined templates or additional model training.

### [What models does Upstage provide?](https://console.upstage.ai/docs/capabilities/extract/universal-extraction#what-models-does-upstage-provide)

|Alias|Currently points to|RPS [(Learn more)](https://console.upstage.ai/docs/guides/rate-limits#information-extract)|
|:--|---|---|
|information-extract|[information-extract-260114](https://console.upstage.ai/docs/models/history#information-extract-260114-beta)|1 (Sync) / 2 (Async)|
||[information-extract-250930](https://console.upstage.ai/docs/models/history#information-extract-250930)|1 (Sync) / 2 (Async)|
||[information-extract-250804](https://console.upstage.ai/docs/models/history#information-extract-250804-beta)|1 (Sync) / 2 (Async)|
|information-extract-nightly|-|1 (Sync) / 2 (Async)|

Extract Key Information in the Playground!

Identify and structure critical data from unstructured documents — ideal for automation beyond basic digitization.

[Try it in the Playground](https://console.upstage.ai/playground/universal-information-extraction)

![Extract Key Information in the Playground! image](https://console.upstage.ai/assets/images/docs/demo-ie.svg)

Ready to build?

✓ Get $10 on signup

✓ Create your API key instantly

✓ Quick test with example codes

[Get started with API](https://console.upstage.ai/docs/getting-started)

![Ready to build image](https://console.upstage.ai/assets/images/docs/ready-to-build.svg)

### [Sending a request in three simple steps](https://console.upstage.ai/docs/capabilities/extract/universal-extraction#sending-a-request-in-three-simple-steps)

The Upstage Information Extract API is designed to follow [OpenAI Chat Completion API](https://platform.openai.com/docs/api-reference/chat/create)'s request and response formats. Users can use the OpenAI SDK to structure requests and handle responses accordingly.

#### [Add input files to `messages`](https://console.upstage.ai/docs/capabilities/extract/universal-extraction#add-input-files-to-messages)

You can input a single file, which should be provided as URL or base64 encoded string in the `messages` field, formatted as follows:

```
{  "type": "image_url",  "image_url": {"url": f"data:application/octet-stream;base64,{base64_data}"}}
```

Requirements for the input file are:

- **Supported file formats:** JPEG, PNG, BMP, PDF, TIFF, HEIC, DOCX, PPTX, XLSX, HWP, HWPX
- **Maximum file size:** 50MB
- **Maximum number of pages per file:** 100 pages
- **Maximum pixels per page:** 200,000,000 pixels. (For non-image files, the number of pixels is determined after converting the file to images at 150 DPI.)
- **Supported character sets:** Alphanumeric, Hangul, Hanja, Katakana, and Hiragana are supported. Hanzi and Kanji are in beta versions, which means they are available but not fully supported.

Hanja, Hanzi, and Kanji are writing systems based on Chinese characters used in Korean, Chinese, and Japanese writing systems. Despite sharing similarities, they possess distinct visual representations, pronunciations, meanings, and usage conventions within their respective linguistic contexts. For more information, see [this article](https://en.wikipedia.org/wiki/Hanja).

#### [Set schema in `response_format`](https://console.upstage.ai/docs/capabilities/extract/universal-extraction#set-schema-in-response_format)

A schema defines the structure of the information to be extracted. Instructions for writing a schema can be found [here](https://console.upstage.ai/docs/capabilities/extract/writing-a-schema). An example schema is shown in the image below.

![schema-generate.png](https://console.upstage.ai/_next/image?url=%2Fassets%2Fimages%2Fdocs%2Finformation-extract.png&w=3840&q=75)

The schema can be provided in the `response_format` field.

```
{  "type": "json_schema",  "json_schema": {    "name": "some_document_schema_name_of_your_choice",    "schema": {      "type": "object",      "properties": {        "bank_name": {          "type": "string",          "description": "The name of bank in bank statement."        },        "transactions": {          "type": "array",          "items": {            "type": "object",            "properties": {              "transaction_date": {                "type": "string",                "description": "Date on which each transaction occurred."              },              "transaction_description": {                "type": "string",                "description": "Description of each transaction."              }            }          }        }      }    }  }}
```

- `name`: Must be 64 characters or less and can include alphanumerics, underscores, and dashes.
- `schema`: Basically, a schema should follow the [JSON Schema Syntax](https://json-schema.org/overview/what-is-jsonschema). Read the [Writing a schema](https://console.upstage.ai/docs/capabilities/extract/writing-a-schema) page for additional details.

#### [Get the response](https://console.upstage.ai/docs/capabilities/extract/universal-extraction#get-the-response)

The response structure mirrors the [OpenAI Chat Completion Object](https://platform.openai.com/docs/api-reference/chat/object). The extraction results are in the content of messages as stringified JSON objects. It strictly follows the user input schema.

```
import jsonresult = json.loads(extraction_response.choices[0].message.content)print(result)
```

```
{    "bank_name": "Bank of Dream",    "transactions": [        {            "transaction_date": "2023-06-03",            "transaction_description": "Salary"        },        {            "transaction_date": "2023-06-07",            "transaction_description": "Rent"        }    ]}
```

### [Examples](https://console.upstage.ai/docs/capabilities/extract/universal-extraction#examples)

![bank_statement.png](https://console.upstage.ai/_next/image?url=%2Fassets%2Fimages%2Fdocs%2Fbank_statement.png&w=3840&q=75)

[

bank_statement.png

](https://console.upstage.ai/assets/images/docs/bank_statement.png)

#### [Simple extraction](https://console.upstage.ai/docs/capabilities/extract/universal-extraction#simple-extraction)

Extract structured information from documents using a defined JSON schema.

**Request**

PythonLangChaincURLjavascript

```
# pip install openaiimport base64import jsonfrom openai import OpenAI client = OpenAI(    api_key="up_*************************o1DK",    base_url="https://api.upstage.ai/v1/information-extraction") def encode_img_to_base64(img_path):    with open(img_path, 'rb') as img_file:        img_bytes = img_file.read()        base64_data = base64.b64encode(img_bytes).decode('utf-8')        return base64_data # Read the image file and encode it to base64filepath = "./bank_statement.png"base64_data = encode_img_to_base64(filepath) # Information Extraction Request using the generated schemaextraction_response = client.chat.completions.create(    model="information-extract",    messages=[        {            "role": "user",            "content": [                {                    "type": "image_url",                    "image_url": {"url": f"data:application/octet-stream;base64,{base64_data}"}                }            ]        }    ],    response_format={        "type": "json_schema",        "json_schema": {            "name": "document_schema",            "schema": {                "type": "object",                "properties": {                    "bank_name": {                        "type": "string",                        "description": "The name of bank in bank statement"                    }                }            }        }    }) print(extraction_response)
```

**Response**

```
{  "id": "iex-AQZoWf2p5j6TO-AE",  "choices": [    {      "finish_reason": "stop",      "index": null,      "logprobs": null,      "message": {        "content": "{\"bank_name\":\"Bank of Dream\"}",        "role": "assistant",        "function_call": null,        "tool_calls": null      }    }  ],  "created": 1742838017,  "model": "information-extract-250930",  "object": null,  "system_fingerprint": null,  "usage": {    "completion_tokens": 9,    "prompt_tokens": 951,    "total_tokens": 960,    "completion_tokens_details": null,    "prompt_tokens_details": null  }}
```

#### [Extraction modes (Beta)](https://console.upstage.ai/docs/capabilities/extract/universal-extraction#extraction-modes-beta)

Extract information from documents using different extraction modes.

- **Standard** (`mode: "standard"`) is the default extraction mode that provides fast and accurate extraction for most document types.
- **Enhanced** (`mode: "enhanced"`) is the extraction mode that offers improved robustness for challenging documents:
    - **Complex tables**: Better handling of nested tables, merged cells, and irregular table structures
    - **Poor quality scans**: Improved extraction from low-resolution or degraded document scans
    - **Handwritten text**: Enhanced recognition of handwritten content

Enhanced mode incurs additional costs. See the [pricing page](https://www.upstage.ai/pricing) for details.

**Request**

PythonLangChaincURLjavascript

```
extraction_response = client.chat.completions.create(    model="information-extract",    messages=[        {            "role": "user",            "content": [                {                    "type": "image_url",                    "image_url": {"url": f"data:application/octet-stream;base64,{base64_data}"}                }            ]        }    ],    response_format={        "type": "json_schema",        "json_schema": {            "name": "document_schema",            "schema": {                "type": "object",                "properties": {                    "bank_name": {                        "type": "string",                        "description": "The name of bank in bank statement"                    }                }            }        }    },    extra_body={         "mode": "enhanced"    } )print(extraction_response)
```



---

### Writing a schema

There are two ways to acquire a schema for universal information extraction:

Automatic schema generation (recommended)  
Manual schema design.  
Automatic schema generation  
Manually defining a schema can be daunting and may require multiple trial-and-error attempts. The Schema Generation API helps you to create an initial schema from up to three sample files with ease.

The extracted schema is returned as a stringified JSON object within the message content. It adheres to the JSON Schema syntax and input schema restriction of the Information Extract API. User can provide their intention about the schema generation through the system message.

Try editing the extracted schema to better match your specific extraction needs before using it in the information extraction process.

Python  
LangChain  
cURL  
javascript
```Python
import base64  
import json  
from openai import OpenAI

client = OpenAI(  
api_key="up_*************************o1DK",  
base_url="[https://api.upstage.ai/v1/information-extraction/schema-generation](https://www.google.com/url?sa=E&q=https%3A%2F%2Fapi.upstage.ai%2Fv1%2Finformation-extraction%2Fschema-generation)"  
)

def encode_img_to_base64(img_path):  
with open(img_path, 'rb') as img_file:  
img_bytes = img_file.read()  
base64_data = base64.b64encode(img_bytes).decode('utf-8')  
return base64_data

# Read the image file and encode it to base64

img_path = "./bank_statement.png"  
base64_data = encode_img_to_base64(img_path)

# Schema generation request

schema_response = client.chat.completions.create(  
model="information-extract",  
messages=[  
{  
"role": "user",  
"content": [  
{  
"role": "system",  
"content": "Generate schema about bank_name."  
},  
{  
"type": "image_url",  
"image_url": {"url": f"data:image/png;base64,{base64_data}"}  
}  
]  
}  
],  
)  
schema = json.loads(schema_response.choices[0].message.content)
```

```
{  
"type": "json_schema",  
"json_schema": {  
"name": "document_schema",  
"schema": {  
"type": "object",  
"properties": {  
"bank_name": {  
"type": "string",  
"description": "The name of bank in bank statement."  
}  
}  
}  
}  
}  
```
Manual schema design  
We recommend starting with automatic schema generation, but you can also manually define the schema or modify an automatically generated one.

Available datatypes  
Schemas should follow the JSON Schema Syntax. The following types are supported for Schema:

| types   | type description                                  | example            |
| ------- | ------------------------------------------------- | ------------------ |
| string  | strings of text                                   | `"hello"`          |
| number  | any numeric type, including floating point number | `1.3`, `3.141`     |
| integer | integral numbers                                  | `42`, `-5`         |
| boolean | true or false                                     | `true`             |
| array   | analogous to the list or tuple type               | `["a", "b", "c"]`  |
| object  | analogous to the dict type                        | `{"key": "value"}` |
Note that the root object must be object type.  
Arrays: If you need to extract multiple values for the same key, you can use the array type. In {"type": "array"}, the "items" keyword must be specified to define the values.  
Objects: To define multiple properties under a key, you can use the object type. In {"type": "object"}, the "properties" keyword must follow to define the structure. Additionally, the object type can be used as the items of an array to represent table structures. An example is shown below:

```
{  
"type": "object",  
"properties": {  
"transactions": {  
"type": "array",  
"items": {  
"type": "object",  
"properties": {  
"transaction_date": {  
"type": "string",  
"description": "Date on which each transaction occurred."  
},  
"transaction_description": {  
"type": "string",  
"description": "Description of each transaction."  
}  
}  
}  
}  
}  
}  
```
Schema design best practices  
Use clear key names and descriptions: Providing clear and descriptive key names and descriptions significantly improves the accuracy of data extraction.  
Avoid vauge or overly generic key names: Use specific terms where applicable, and include concise descriptions that explain the purpose and expected values of each key.  

Schema design restrictions  
Note that when you manually design a schema, there are some restrictions involved.

In a schema, total string length of all property names and definition names cannot exceed 10,000 characters.  
Up to 100 object properties and 15,000 characters are allowed in synchronous API.  
Up to 5000 object properties and 120,000 characters are allowed in asynchronous API.  
First-level properties must be of type string, integer, number, or array (object type is not permitted).
```

{  
"type": "object",  
"properties": {  
"bank_name": {  
"type": "object", # ❌ Object type properties are not allowed in the first-level  
"properties": {  
...  
}  
}  
}  
}  
```
An array cannot contain items of arrays.
```
{  
"type": "object",  
"properties": {  
"bank": {  
"type": "array",  
"items": { "type": "array", "items": {...}} # ❌ Nested arrays are not allowed  
}  
}  
}
```



## [Writing a schema](https://console.upstage.ai/docs/capabilities/extract/writing-a-schema#writing-a-schema)

There are two ways to acquire a schema for [universal information extraction](https://console.upstage.ai/docs/capabilities/extract/universal-extraction):

1. [Automatic schema generation](https://console.upstage.ai/docs/capabilities/extract/writing-a-schema#automatic-schema-generation) (recommended)
2. [Manual schema design](https://console.upstage.ai/docs/capabilities/extract/writing-a-schema#manual-schema-design).

### [Automatic schema generation](https://console.upstage.ai/docs/capabilities/extract/writing-a-schema#automatic-schema-generation)

[Manually defining a schema](https://console.upstage.ai/docs/capabilities/extract/writing-a-schema#manual-schema-design) can be daunting and may require multiple trial-and-error attempts. The [Schema Generation API](https://console.upstage.ai/api/information-extraction/universal-information-extraction/schema-generation) helps you to create an initial schema from up to three sample files with ease.

The extracted schema is returned as a stringified JSON object within the message content. It adheres to the [JSON Schema syntax](https://json-schema.org/overview/what-is-jsonschema) and [input schema restriction](https://console.upstage.ai/docs/capabilities/information-extraction/universal-information-extraction#schema-design-restrictions) of the Information Extract API. User can provide their intention about the schema generation through the system message.

Try editing the extracted schema to better match your specific extraction needs before using it in the information extraction process.

PythonLangChaincURLjavascript

```
import base64import jsonfrom openai import OpenAI client = OpenAI(    api_key="up_*************************o1DK",    base_url="https://api.upstage.ai/v1/information-extraction/schema-generation") def encode_img_to_base64(img_path):    with open(img_path, 'rb') as img_file:        img_bytes = img_file.read()        base64_data = base64.b64encode(img_bytes).decode('utf-8')        return base64_data # Read the image file and encode it to base64img_path = "./bank_statement.png"base64_data = encode_img_to_base64(img_path) # Schema generation requestschema_response = client.chat.completions.create(    model="information-extract",    messages=[        {            "role": "user",            "content": [                {                    "role": "system",                    "content": "Generate schema about bank_name."                },                {                    "type": "image_url",                    "image_url": {"url": f"data:image/png;base64,{base64_data}"}                }            ]        }    ],)schema = json.loads(schema_response.choices[0].message.content)
```

```
{  "type": "json_schema",  "json_schema": {    "name": "document_schema",    "schema": {      "type": "object",      "properties": {        "bank_name": {          "type": "string",          "description": "The name of bank in bank statement."        }      }    }  }}
```

### [Manual schema design](https://console.upstage.ai/docs/capabilities/extract/writing-a-schema#manual-schema-design)

We recommend starting with [automatic schema generation](https://console.upstage.ai/docs/capabilities/extract/writing-a-schema#automatic-schema-generation), but you can also manually define the schema or modify an automatically generated one.

### [Available datatypes](https://console.upstage.ai/docs/capabilities/extract/writing-a-schema#available-datatypes)

Schemas should follow the [JSON Schema Syntax](https://json-schema.org/overview/what-is-jsonschema). The following types are supported for Schema:

|types|type description|example|
|---|---|---|
|string|strings of text|`"hello"`|
|number|any numeric type, including floating point number|`1.3`, `3.141`|
|integer|integral numbers|`42`, `-5`|
|boolean|true or false|`true`|
|array|analogous to the list or tuple type|`["a", "b", "c"]`|
|object|analogous to the dict type|`{"key": "value"}`|

- Note that the root object must be `object` type.
- **Arrays**: If you need to extract multiple values for the same key, you can use the `array` type. In `{"type": "array"}`, the `"items"` keyword must be specified to define the values.
- **Objects**: To define multiple properties under a key, you can use the object type. In `{"type": "object"}`, the `"properties"` keyword must follow to define the structure. Additionally, the object type can be used as the items of an array to represent table structures. An example is shown below:
    
    ```
    {  "type": "object",  "properties": {    "transactions": {      "type": "array",      "items": {        "type": "object",        "properties": {          "transaction_date": {            "type": "string",            "description": "Date on which each transaction occurred."          },          "transaction_description": {            "type": "string",            "description": "Description of each transaction."          }        }      }    }  }}
    ```
    

#### [Schema design best practices](https://console.upstage.ai/docs/capabilities/extract/writing-a-schema#schema-design-best-practices)

- **Use clear key names and descriptions**: Providing clear and descriptive key names and descriptions significantly improves the accuracy of data extraction.
- **Avoid vauge or overly generic key names**: Use specific terms where applicable, and include concise descriptions that explain the purpose and expected values of each key.

#### [Schema design restrictions](https://console.upstage.ai/docs/capabilities/extract/writing-a-schema#schema-design-restrictions)

Note that when you manually design a schema, there are some restrictions involved.

- In a `schema`, total string length of all property names and definition names cannot exceed 10,000 characters.
- Up to 100 object properties and 15,000 characters are allowed in synchronous API.
- Up to 5000 object properties and 120,000 characters are allowed in asynchronous API.
- First-level properties must be of type string, integer, number, or array (object type is not permitted).
    
    ```
    {  "type": "object",  "properties": {    "bank_name": {      "type": "object",  # ❌ Object type properties are not allowed in the first-level      "properties": {          ...      }    }  }}
    ```
    
- An array cannot contain items of arrays.
    
    ```
    {  "type": "object",  "properties": {    "bank": {      "type": "array",      "items": { "type": "array", "items": {...}}  # ❌ Nested arrays are not allowed    }  }}
    ```


## [Location coordinates](https://console.upstage.ai/docs/capabilities/extract/location-coordinates#location-coordinates)

### [Overview](https://console.upstage.ai/docs/capabilities/extract/location-coordinates#overview)

When extracting information from documents, knowing **where** the information is located can be as important. This is useful for verification, highlighting the source in the UI, or further processing.

### [Location granularity](https://console.upstage.ai/docs/capabilities/extract/location-coordinates#location-granularity)

The API provides a `location_granularity` parameter to control the precision of the coordinate extraction.

|Mode|Description|
|---|---|
|`element`(default)|Returns the coordinates of the entire HTML element (e.g., a table cell, a paragraph) containing the extracted value. This is faster and sufficient for general localization.|
|`word`|Returns the word-level coordinates of the specific words referenced by the extracted value. This is more granular but may take slightly longer.|
|`all`|Returns both the element-level and word-level coordinates.|

### [Usage](https://console.upstage.ai/docs/capabilities/extract/location-coordinates#usage)

To get location coordinates, you need to specify `location` as `true` and `location_granularity` in the `extra_body` of your request. When `location` is set to `true`, the response includes `tool_calls` with the function name `additional_values`. The arguments of this function call contain the extracted values along with their location coordinates.

**Request**

For client setup, check [simple extraction](https://console.upstage.ai/docs/capabilities/extract/universal-extraction#simple-extraction) for more details.

PythonLangChaincURLjavascript

```
extraction_response = client.chat.completions.create(    model="information-extract",    messages=[        {            "role": "user",            "content": [                {                    "type": "image_url",                    "image_url": {"url": f"data:application/octet-stream;base64,{base64_data}"}                }            ]        }    ],    response_format={        "type": "json_schema",        "json_schema": {            "name": "document_schema",            "schema": {                "type": "object",                "properties": {                    "bank_name": {                        "type": "string",                        "description": "The name of bank in bank statement"                    }                }            }        }    },    extra_body={         "location": True,         "location_granularity": "element"    } )print(extraction_response)
```

**Response**

```
{  "id": "iex-AQZoWf2p5j6TO-AE",  "choices": [    {      "finish_reason": "stop",      "index": null,      "logprobs": null,      "message": {        "content": "{\"bank_name\":\"Bank of Dream\"}",        "role": "assistant",        "function_call": null,        "tool_calls": [          {            "type": "function",            "function": {              "name": "additional_values",              "arguments": "{\"bank_name\": {\"_value\": \"Bank of Dream\", \"page\": 1, \"coordinates\": [{\"x\": 0.07, \"y\": 0.148}, {\"x\": 0.2074, \"y\": 0.148}, {\"x\": 0.2074, \"y\": 0.1606}, {\"x\": 0.07, \"y\": 0.1606}]}}"            }          }        ]      }    }  ],  "created": 1742838017,  "model": "information-extract-250930",  "object": null,  "system_fingerprint": null,  "usage": {    "completion_tokens": 9,    "prompt_tokens": 951,    "total_tokens": 960,    "completion_tokens_details": null,    "prompt_tokens_details": null  }}
```

### [Parsing location coordinates in responses](https://console.upstage.ai/docs/capabilities/extract/location-coordinates#parsing-location-coordinates-in-responses)

Users can parse the response to get the location coordinates as follows:

```
import json # ... (API request code) ... if response.choices[0].message.tool_calls:    parsed_result = json.loads(response.choices[0].message.tool_calls[0].function.arguments)    print(parsed_result)
```

The parsed result will be as below according to the `location_granularity` set in the request.

**Element mode** (`location_granularity="element"`)

In this mode, the response includes `coordinates` which represent the bounding box of the element. The coordinates are relative values (0.0 to 1.0) based on the page size.

```
{  "key_name": {    "_value": "extracted value",    "page": 1,    "coordinates": [        {'x': 0.0745, 'y': 0.1005},        {'x': 0.2096, 'y': 0.1005},        {'x': 0.2096, 'y': 0.1591},        {'x': 0.0745, 'y': 0.1591}    ]  }}
```

**Word mode** (`location_granularity="word"`)

In this mode, the response includes both `coordinates` (for the element) and `word_coordinates` (for individual words).

```
{  "key_name": {    "_value": "extracted value",    "page": 1,    "word_coordinates": [    [{'x': 0.0708, 'y': 0.1475},        {'x': 0.1168, 'y': 0.1475},        {'x': 0.1168, 'y': 0.1588},        {'x': 0.0708, 'y': 0.1588}],    [{'x': 0.1221, 'y': 0.1475},        {'x': 0.1469, 'y': 0.1475},        {'x': 0.1469, 'y': 0.16},        {'x': 0.1221, 'y': 0.16}],    [{'x': 0.1522, 'y': 0.1488},        {'x': 0.2071, 'y': 0.1488},        {'x': 0.2071, 'y': 0.16},        {'x': 0.1522, 'y': 0.16}]]  }}
```

**All mode** (`location_granularity="all"`)

In this mode, the response includes both `coordinates` (for the element) and `word_coordinates` (for individual words).

```
{  "key_name": {    "_value": "extracted value",    "page": 1,    "coordinates": [        {'x': 0.0745, 'y': 0.1005},        {'x': 0.2096, 'y': 0.1005},        {'x': 0.2096, 'y': 0.1591},        {'x': 0.0745, 'y': 0.1591}    ],    "word_coordinates": [        [{'x': 0.0708, 'y': 0.1475},        {'x': 0.1168, 'y': 0.1475},        {'x': 0.1168, 'y': 0.1588},        {'x': 0.0708, 'y': 0.1588}],        [{'x': 0.1221, 'y': 0.1475},        {'x': 0.1469, 'y': 0.1475},        {'x': 0.1469, 'y': 0.16},        {'x': 0.1221, 'y': 0.16}],        [{'x': 0.1522, 'y': 0.1488},        {'x': 0.2071, 'y': 0.1488},        {'x': 0.2071, 'y': 0.16},        {'x': 0.1522, 'y': 0.16}]]  }}
```

### [Visualization example](https://console.upstage.ai/docs/capabilities/extract/location-coordinates#visualization-example)

You can visualize the extracted coordinates on the original document image using Python and `PIL`.

```Python
from PIL import Image, ImageDraw
import json
 
def plot_coordinates(image_path, response):
    # Load image
    img = Image.open(image_path)
    draw = ImageDraw.Draw(img)
    width, height = img.size
    
    # Parse response
    if not response.choices[0].message.tool_calls:
        print("No extraction result found.")
        return
        
    tool_call = response.choices[0].message.tool_calls[0]
    parsed_result = json.loads(tool_call.function.arguments)
 
    def draw_polygon(coords, color):
        if not coords:
            return
        # Scale coordinates to image size
        scaled_coords = [(x * width, y * height) for x, y in coords]
        # Draw polygon with outline
        draw.polygon(scaled_coords, outline=color, width=3)
 
    def traverse(data):
        if isinstance(data, dict):
            # Draw if coordinates exist
            if 'coordinates' in data:
                draw_polygon(data['coordinates'], 'red')
            
            if 'word_coordinates' in data:
                for word_poly in data['word_coordinates']:
                    draw_polygon(word_poly, 'blue')
            
            # Recursively traverse all values
            for value in data.values():
                traverse(value)
                
        elif isinstance(data, list):
            for item in data:
                traverse(item)
 
    traverse(parsed_result)
    
    # Display image
    img.show()
 
# Example Usage
# image_path = 'document.jpg'
# plot_coordinates(image_path, response)
```


---

## [Confidence](https://console.upstage.ai/docs/capabilities/extract/confidence#confidence)

### [Overview](https://console.upstage.ai/docs/capabilities/extract/confidence#overview)

Confidence in information extraction is a metric that indicates the reliability of the extracted information.

#### [Confidence vs. Accuracy](https://console.upstage.ai/docs/capabilities/extract/confidence#confidence-vs-accuracy)

It is important to distinguish between **confidence** and **accuracy**:

- **Confidence** is subjective to the model. It indicates how sure the model _thinks_ it is.
- **Accuracy** is objective. It measures whether the extracted data matches the actual ground truth.

Usually, high confidence generally correlates with high accuracy. However, there can be cases where the result is "confident" but "incorrect". Therefore, confidence should be used just as a heuristic for reliability rather than a guarantee of correctness.

### [Human-in-the-Loop (HITL)](https://console.upstage.ai/docs/capabilities/extract/confidence#human-in-the-loop-hitl)

Confidence scores are particularly useful for machine assisted**Human-in-the-Loop (HITL)** workflows instead of manually reviewing every extracted document.

- **High Confidence (> Threshold):** Automatically process the data.
- **Low Confidence (< Threshold):** Flag the result for human review.

This approach significantly reduces manual effort while maintaining high data quality by focusing human attention where it is most needed.

## [Usage](https://console.upstage.ai/docs/capabilities/extract/confidence#usage)

To get confidence, you need to specify `confidence` as `true` in the `extra_body` of your request. The response will include `tool_calls` with the function name `additional_values`. The arguments of this function call contain the extracted values along with their confidence level (`high` or `low`).

**Request** For client setup, check [simple extraction](https://console.upstage.ai/docs/capabilities/extract/universal-extraction#simple-extraction) for more details.

PythonLangChaincURLjavascript

```
extraction_response = client.chat.completions.create(    model="information-extract",    messages=[        {            "role": "user",            "content": [                {                    "type": "image_url",                    "image_url": {"url": f"data:application/octet-stream;base64,{base64_data}"}                }            ]        }    ],    response_format={        "type": "json_schema",        "json_schema": {            "name": "document_schema",            "schema": {                "type": "object",                "properties": {                    "bank_name": {                        "type": "string",                        "description": "The name of bank in bank statement"                    }                }            }        }    },    extra_body={         "confidence": True    } )print(extraction_response)
```

**Response**

```
{  "id": "iex-AQZoWf2p5j6TO-AE",  "choices": [    {      "finish_reason": "stop",      "index": null,      "logprobs": null,      "message": {        "content": "{\"bank_name\":\"Bank of Dream\"}",        "role": "assistant",        "function_call": null,        "tool_calls": [          {            "type": "function",            "function": {              "name": "additional_values",              "arguments": "{\"bank_name\": {\"_value\": \"Bank of Dream\", \"confidence\": \"high\"}}"            }          }        ]      }    }  ],  "created": 1742838017,  "model": "information-extract-250930",  "object": null,  "system_fingerprint": null,  "usage": {    "completion_tokens": 9,    "prompt_tokens": 951,    "total_tokens": 960,    "completion_tokens_details": null,    "prompt_tokens_details": null  }}
```



## [Error codes](https://console.upstage.ai/docs/resources/error-codes#error-codes)

This page will help you quickly identify and resolve common issues by providing detailed explanations for each error code. Please refer to this guide whenever you encounter an error, and follow the recommended steps for resolution.

| **Error code**            | **Cause**                                        | **Possible solutions**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **400**                   | Wrong format or data in request body             | **For Solar APIs:**  <br>• Check if the JSON syntax of the request body is correct  <br>• Check if all `required` keys exist in the request body  <br>• Check if all the keys in the request body are correct  <br>• Check if all the values in the request body are in correct types  <br>• Check if all the values in the request body are correct  <br>• Check if there is any typo!  <br>  <br>**For Document AI APIs:**  <br>• Check if the document file location is correct in the request body  <br>• Check if the document file is the supported file format  <br>• Check if the document file is less than 50MB  <br>• Check if there is any typo! |
| **401**                   | Invalid API key provided                         | • Check if you set API key in your request header  <br>• Check if `Authorization` header is in correct form - “Bearer `API_KEY`”  <br>• Check if your API Key is not deleted in Console  <br>• Check if there is any typo!                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| **403**                   | Insufficient credit                              | You have insufficient credit. [Please register a payment method.](https://console.upstage.ai/billing)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **404**                   | Wrong URL path                                   | • Check if your request path is correct                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **405**                   | Wrong URL path using `http://`                   | • Use `https://` instead of `http://`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **415**                   | Unsupported file format for the operation        | • Check if your file format is supported for conversion, split, or extraction  <br>• Use a supported file format                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **422**                   | Document is damaged or corrupted                 | • Check if the file is not corrupted or damaged  <br>• Try re-saving or re-exporting the file                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| **429**                   | Too many requests in a specific time period      | • Check if you sending request more than its [limit](https://developers.upstage.ai/docs/guides/rate-limits)  <br>• If you want to increase the rate limit, [please contact support](https://go.upstage.ai/errorcode2support1)                                                                                                                                                                                                                                                                                                                                                                                                                                |
| **500 / 502 / 503 / 504** | There was an error while processing your request | • Retry your request after some time  <br>• If you keep getting the error, [please contact support](https://go.upstage.ai/errorcode2support1)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
