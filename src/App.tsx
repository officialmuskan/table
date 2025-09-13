
import { InputNumber } from "primereact/inputnumber";
import { useState, useEffect, useRef } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { BiChevronDown } from "react-icons/bi";
import { OverlayPanel } from "primereact/overlaypanel";
import { Button } from "primereact/button";

interface Artwork {
  id: number;
  title: string;
  place_of_origin: string;
  artist_display: string;
  inscriptions: string;
  date_start: number;
  date_end: number;
}

export default function App() {
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalArtworks, setTotalArtworks] = useState(0);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [value1, setValue1] = useState<number | null>(null);

  const [allArtworks, setAllArtworks] = useState<Artwork[]>([]);
  console.log("All Artworks Length:", allArtworks);
  const [bulkSelectionTarget, setBulkSelectionTarget] = useState<number>(0);
  console.log("Bulk Selection Target:", bulkSelectionTarget);
  const [isBulkSelectionActive, setIsBulkSelectionActive] = useState<boolean>(false);

  const op = useRef<OverlayPanel>(null);
  const PAGE_SIZE = 12;

  async function getArtworksFromAPI(pageNumber: number) {
    setLoading(true);
    try {
      const url = `https://api.artic.edu/api/v1/artworks?page=${pageNumber}&limit=${PAGE_SIZE}`;
      const response = await fetch(url);
      const data = await response.json();
      setArtworks(data.data);
      setTotalArtworks(data.pagination.total);
      
      setAllArtworks(prev => {
        const newAll = [...prev];
        const startIndex = (pageNumber - 1) * PAGE_SIZE;
        data.data.forEach((artwork: Artwork, index: number) => {
          newAll[startIndex + index] = artwork;
        });
        return newAll;
      });
      
    } catch (error) {
      console.error("Error getting artworks:", error);
    }
    setLoading(false);
  }

  useEffect(() => {
    getArtworksFromAPI(1);
  }, []);

  function handlePageChange(event: any) {
    const newPageIndex = event.first / PAGE_SIZE;
    const apiPageNumber = newPageIndex + 1;
    setCurrentPageIndex(newPageIndex);
    getArtworksFromAPI(apiPageNumber);
  }

  function handleSelectionChange(event: any) {
    if (isBulkSelectionActive) {
      return;
    }
    
    const currentPageSelectedIds = event.value.map((artwork: Artwork) => artwork.id);
    const newSelected = new Set(selectedIds);
    artworks.forEach((artwork) => newSelected.delete(artwork.id));
    currentPageSelectedIds.forEach((id: number) => newSelected.add(id));
    setSelectedIds(newSelected);
  }

  function getSelectedArtworksOnThisPage() {
    return artworks.filter((artwork) => selectedIds.has(artwork.id));
  }

  async function handleBulkSelect() {
    if (!value1 || value1 <= 0) {
      alert("Please enter a valid number");
      return;
    }

    setSelectedIds(new Set());
    setBulkSelectionTarget(value1);
    setIsBulkSelectionActive(true);
    
    const newSelected = new Set<number>();
    let selectedCount = 0;
    
    const pagesNeeded = Math.ceil(value1 / PAGE_SIZE);
    
    try {
      for (let page = 1; page <= pagesNeeded && selectedCount < value1; page++) {
        const url = `https://api.artic.edu/api/v1/artworks?page=${page}&limit=${PAGE_SIZE}`;
        const response = await fetch(url);
        const data = await response.json();
        
        for (let i = 0; i < data.data.length && selectedCount < value1; i++) {
          newSelected.add(data.data[i].id);
          selectedCount++;
        }
      }
      
      setSelectedIds(newSelected);
      console.log(`Bulk selected ${selectedCount} items`);
      
    } catch (error) {
      console.error("Error during bulk selection:", error);
    }
    
    setIsBulkSelectionActive(false);
    op.current?.hide();
  }

  const headerTemplate = () => {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
        <BiChevronDown
          size={18}
          style={{ 
            cursor: "pointer",
            color: isBulkSelectionActive ? "#3b82f6" : "#666"
          }}
          onClick={(e) => op.current?.toggle(e)}
        />
      </div>
    );
  };

  return (
    <div style={{ padding: "20px" }}>
      <OverlayPanel ref={op}>
        <div style={{ width: 250, padding: 15 }}>
          <div style={{ marginBottom: 10 }}>
            <InputNumber
              value={value1}
              onValueChange={(e) => setValue1(e.value)}
              placeholder="select rows..."
              min={1}
              max={totalArtworks}
              style={{ width: "100%" }}
            />
          </div>
          
          <div style={{ display: "flex", gap: 8 }}>
            <Button
              label="Submit"
              size="small"
              onClick={handleBulkSelect}
              style={{ flex: 1 }}
              disabled={loading}
            />
          </div>
        </div>
      </OverlayPanel>

      <DataTable
        paginator
        rows={12}
        value={artworks}
        onSelectionChange={handleSelectionChange}
        onPage={handlePageChange}
        lazy
        loading={loading}
        dataKey="id"
        totalRecords={totalArtworks}
        showGridlines
        first={currentPageIndex * PAGE_SIZE}
        selection={getSelectedArtworksOnThisPage()}
        selectionMode="multiple"
        paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport"
        currentPageReportTemplate="Showing {first} to {last} of {totalRecords} artworks"
      >
        <Column
          selectionMode="multiple"
          style={{ width: "3rem" }}
          header={headerTemplate}
        />
        <Column 
          field="title" 
          header="Title" 
          body={(artwork) => artwork.title || "Untitled"} 
        />
        <Column 
          field="place_of_origin" 
          header="Place" 
          body={(artwork) => artwork.place_of_origin || "Unknown"} 
        />
        <Column 
          field="artist_display" 
          header="Artist" 
          body={(artwork) => artwork.artist_display || "Unknown Artist"} 
        />
        <Column 
          field="inscriptions" 
          header="Inscriptions" 
          body={(artwork) => artwork.inscriptions || "None"} 
        />
        <Column 
          header="Date" 
          body={(artwork) => {
            return `${artwork.date_start} - ${artwork.date_end}`;
          }}
        />
      </DataTable>
    </div>
  );
}