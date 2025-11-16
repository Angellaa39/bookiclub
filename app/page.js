'use client'

import React, { useState, useEffect } from 'react';
import { Star, BookOpen, Users, Sparkles, Plus, Trash2, Edit2, CheckCircle, Clock, Upload, Quote } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function BookClubTracker() {
  const [books, setBooks] = useState([]);
  const [members, setMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBook, setSelectedBook] = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);
  const [showAddBook, setShowAddBook] = useState(false);
  const [showAddReview, setShowAddReview] = useState(false);
  const [showAddQuote, setShowAddQuote] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [editingBook, setEditingBook] = useState(null);
  const [activeTab, setActiveTab] = useState('toRead');
  const [newMemberName, setNewMemberName] = useState('');
  const [coverImageFile, setCoverImageFile] = useState(null);
  const [coverImagePreview, setCoverImagePreview] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  
  const [newBook, setNewBook] = useState({
    title: '', 
    author: '', 
    pages: '', 
    price: '', 
    summary: '', 
    coverUrl: '', 
    status: 'toRead', 
    endDate: '', 
    suggestedBy: '', 
    year: '', 
    genres: [],
    startDate: ''
  });
  
  const [newReview, setNewReview] = useState({
    member: '', 
    writing: 0, 
    plot: 0, 
    characters: 0, 
    impact: 0,
    readingTime: '',
    comment: ''
  });

  const [newQuote, setNewQuote] = useState({
    member: '', text: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: booksData, error: booksError } = await supabase
        .from('books')
        .select('*, reviews(*), quotes(*)')
        .order('created_at', { ascending: false });

      if (booksError) throw booksError;
      
      const transformedBooks = booksData.map(book => ({
        id: book.id,
        title: book.title,
        author: book.author,
        pages: book.pages || 0,
        price: book.price || '',
        summary: book.summary || '',
        coverUrl: book.cover_url || '',
        status: book.status,
        endDate: book.end_date || '',
        startDate: book.start_date || '',
        suggestedBy: book.suggested_by || '',
        year: book.year || '',
        genres: book.genres || [],
        reviews: book.reviews || [],
        quotes: book.quotes || []
      }));

      setBooks(transformedBooks);

      const { data: membersData, error: membersError } = await supabase
        .from('members')
        .select('*')
        .order('created_at', { ascending: true });

      if (membersError) throw membersError;
      setMembers(membersData || []);

    } catch (error) {
      console.error('Erreur de chargement:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCoverImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('L\'image est trop grande (max 5MB)');
        return;
      }
      
      setCoverImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadCoverImage = async (file) => {
    if (!file) return null;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = fileName;

      const { error: uploadError } = await supabase.storage
        .from('covers')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('covers')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Erreur upload:', error);
      throw error;
    }
  };

  const addBook = async () => {
    if (!newBook.title || !newBook.author) return;

    setIsUploading(true);
    try {
      let coverUrl = '';
      
      if (coverImageFile) {
        coverUrl = await uploadCoverImage(coverImageFile);
      }

      const { data, error } = await supabase
        .from('books')
        .insert([{
          title: newBook.title,
          author: newBook.author,
          pages: parseInt(newBook.pages) || 0,
          price: newBook.price,
          summary: newBook.summary,
          cover_url: coverUrl,
          status: newBook.status,
          end_date: newBook.endDate || null,
          start_date: newBook.startDate || null,
          suggested_by: newBook.suggestedBy || null,
          year: newBook.year || null,
          genres: newBook.genres || []
        }])
        .select('*, reviews(*), quotes(*)')
        .single();

      if (error) throw error;

      const transformedBook = {
        id: data.id,
        title: data.title,
        author: data.author,
        pages: data.pages,
        price: data.price,
        summary: data.summary,
        coverUrl: data.cover_url,
        status: data.status,
        endDate: data.end_date,
        startDate: data.start_date,
        suggestedBy: data.suggested_by,
        year: data.year,
        genres: data.genres,
        reviews: [],
        quotes: []
      };

      setBooks([transformedBook, ...books]);
      setNewBook({ title: '', author: '', pages: '', price: '', summary: '', coverUrl: '', status: 'toRead', endDate: '', startDate: '', suggestedBy: '', year: '', genres: [] });
      setCoverImageFile(null);
      setCoverImagePreview('');
      setShowAddBook(false);
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de l\'ajout du livre');
    } finally {
      setIsUploading(false);
    }
  };

  const deleteBook = async (id) => {
    try {
      const book = books.find(b => b.id === id);
      if (book?.coverUrl) {
        const fileName = book.coverUrl.split('/').pop();
        await supabase.storage.from('covers').remove([fileName]);
      }

      const { error } = await supabase.from('books').delete().eq('id', id);
      if (error) throw error;
      setBooks(books.filter(b => b.id !== id));
      if (selectedBook?.id === id) setSelectedBook(null);
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const updateBook = async () => {
    try {
      const { error } = await supabase
        .from('books')
        .update({
          title: editingBook.title,
          author: editingBook.author,
          pages: editingBook.pages,
          price: editingBook.price,
          summary: editingBook.summary,
          end_date: editingBook.endDate || null,
          start_date: editingBook.startDate || null,
          year: editingBook.year || null,
          genres: editingBook.genres || []
        })
        .eq('id', editingBook.id);

      if (error) throw error;
      const updatedBooks = books.map(b => b.id === editingBook.id ? editingBook : b);
      setBooks(updatedBooks);
      if (selectedBook?.id === editingBook.id) setSelectedBook(editingBook);
      setEditingBook(null);
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const toggleBookStatus = async (bookId) => {
    const book = books.find(b => b.id === bookId);
    let newStatus = book.status === 'toRead' ? 'reading' : book.status === 'reading' ? 'read' : 'toRead';

    try {
      const { error } = await supabase.from('books').update({ status: newStatus }).eq('id', bookId);
      if (error) throw error;
      const updatedBooks = books.map(b => b.id === bookId ? { ...b, status: newStatus } : b);
      setBooks(updatedBooks);
      if (selectedBook?.id === bookId) setSelectedBook({ ...selectedBook, status: newStatus });
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const addReview = async () => {
    if (!newReview.member || newReview.writing <= 0 || newReview.plot <= 0 || newReview.characters <= 0 || newReview.impact <= 0) return;

    const averageRating = ((newReview.writing + newReview.plot + newReview.characters + newReview.impact) / 4).toFixed(1);

    try {
      const { data, error } = await supabase
        .from('reviews')
        .insert([{ 
          book_id: selectedBook.id, 
          member: newReview.member, 
          rating: parseFloat(averageRating),
          writing: newReview.writing,
          plot: newReview.plot,
          characters: newReview.characters,
          impact: newReview.impact,
          reading_time: newReview.readingTime || null,
          comment: newReview.comment 
        }])
        .select().single();

      if (error) throw error;
      const updatedBook = { ...selectedBook, reviews: [...selectedBook.reviews, data] };
      const updatedBooks = books.map(b => b.id === selectedBook.id ? updatedBook : b);
      setBooks(updatedBooks);
      setSelectedBook(updatedBook);
      setNewReview({ member: '', writing: 0, plot: 0, characters: 0, impact: 0, readingTime: '', comment: '' });
      setShowAddReview(false);
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const addQuote = async () => {
    if (!newQuote.member || !newQuote.text.trim()) return;

    try {
      const { data, error } = await supabase
        .from('quotes')
        .insert([{ 
          book_id: selectedBook.id, 
          member: newQuote.member, 
          text: newQuote.text 
        }])
        .select().single();

      if (error) throw error;
      const updatedBook = { ...selectedBook, quotes: [...selectedBook.quotes, data] };
      const updatedBooks = books.map(b => b.id === selectedBook.id ? updatedBook : b);
      setBooks(updatedBooks);
      setSelectedBook(updatedBook);
      setNewQuote({ member: '', text: '' });
      setShowAddQuote(false);
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const addMember = async () => {
    if (!newMemberName.trim()) return;
    try {
      const { data, error } = await supabase.from('members').insert([{ name: newMemberName.trim() }]).select().single();
      if (error) throw error;
      setMembers([...members, data]);
      setNewMemberName('');
      setShowAddMember(false);
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const deleteMember = async (id) => {
    try {
      const { error } = await supabase.from('members').delete().eq('id', id);
      if (error) throw error;
      setMembers(members.filter(m => m.id !== id));
      if (selectedMember?.id === id) setSelectedMember(null);
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const drawRandomBook = () => {
    const toReadBooks = books.filter(b => b.status === 'toRead');
    if (toReadBooks.length > 0) {
      setSelectedBook(toReadBooks[Math.floor(Math.random() * toReadBooks.length)]);
      setActiveTab('toRead');
      setSelectedMember(null);
    } else {
      alert("Tous les livres ont été lus ! Ajoutez-en de nouveaux 📚");
    }
  };

  const getMemberActivity = (memberName) => {
    const suggestedBooks = books.filter(b => b.suggestedBy === memberName);
    const reviews = books.flatMap(b => 
      b.reviews.filter(r => r.member === memberName).map(r => ({ ...r, bookTitle: b.title, bookId: b.id }))
    );
    const quotes = books.flatMap(b => 
      b.quotes.filter(q => q.member === memberName).map(q => ({ ...q, bookTitle: b.title, bookId: b.id }))
    );
    
    return { suggestedBooks, reviews, quotes };
  };

  const StarRating = ({ rating, onRate, readonly = false }) => (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(star => (
        <Star
          key={star}
          size={20}
          className={`${rating >= star ? 'fill-pink-400 text-pink-400' : 'text-gray-300'} ${!readonly && 'cursor-pointer hover:fill-pink-300 hover:text-pink-300'}`}
          onClick={() => !readonly && onRate(star)}
        />
      ))}
    </div>
  );

  const toReadBooks = books.filter(b => b.status === 'toRead');
  const readingBooks = books.filter(b => b.status === 'reading');
  const readBooks = books.filter(b => b.status === 'read');
  const displayBooks = activeTab === 'toRead' ? toReadBooks : activeTab === 'reading' ? readingBooks : readBooks;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50">
        <div className="text-center">
          <BookOpen size={64} className="text-pink-500 animate-pulse mx-auto mb-4" />
          <p className="text-xl text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-3xl shadow-lg p-8 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-br from-pink-400 to-purple-500 p-4 rounded-2xl">
                <BookOpen className="text-white" size={32} />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">Booki Club</h1>
                <p className="text-gray-600 flex items-center gap-2 mt-1 text-sm">
                  <Users size={16} />
                  {books.length} livre{books.length > 1 ? 's' : ''} • {toReadBooks.length} à lire • {readingBooks.length} en cours • {readBooks.length} lu{readBooks.length > 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={drawRandomBook} className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 hover:shadow-lg transform hover:scale-105 transition-all">
                <Sparkles size={20} />
                Tirage au sort
              </button>
              <button onClick={() => setShowAddBook(true)} className="bg-gradient-to-r from-pink-400 to-purple-500 text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 hover:shadow-lg transform hover:scale-105 transition-all">
                <Plus size={20} />
                Ajouter
              </button>
            </div>
          </div>
        </div>

        {/* Membres */}
        <div className="bg-white rounded-3xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-blue-400 to-purple-500 p-3 rounded-xl">
                <Users className="text-white" size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">Membres</h2>
                <p className="text-sm text-gray-600">{members.length} membre{members.length > 1 ? 's' : ''}</p>
              </div>
            </div>
            <button onClick={() => setShowAddMember(true)} className="bg-gradient-to-r from-blue-400 to-purple-500 text-white px-5 py-2 rounded-xl font-semibold flex items-center gap-2 hover:shadow-lg">
              <Plus size={18} />
              Ajouter
            </button>
          </div>
          <div className="flex flex-wrap gap-3">
            {members.map(m => (
              <div 
                key={m.id} 
                onClick={() => { setSelectedMember(m); setSelectedBook(null); }}
                className="px-4 py-2 rounded-xl flex items-center gap-2 group cursor-pointer bg-gradient-to-r from-blue-50 to-purple-50 hover:shadow-md"
              >
                <span className="font-semibold text-gray-800">{m.name}</span>
                <button 
                  onClick={(e) => { e.stopPropagation(); deleteMember(m.id); }} 
                  className="p-1 rounded-lg opacity-0 group-hover:opacity-100 text-red-500 hover:bg-red-100"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            {members.length === 0 && <p className="text-gray-400 text-sm">Aucun membre</p>}
          </div>
        </div>

        {/* Grille principale */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Liste */}
          <div className="bg-white rounded-3xl shadow-lg p-6">
            <div className="flex gap-2 mb-4">
              {[
                { key: 'toRead', icon: Clock, label: 'À lire', count: toReadBooks.length, color: 'from-orange-400 to-pink-400' },
                { key: 'reading', icon: BookOpen, label: 'En cours', count: readingBooks.length, color: 'from-blue-400 to-purple-400' },
                { key: 'read', icon: CheckCircle, label: 'Lus', count: readBooks.length, color: 'from-green-400 to-teal-400' }
              ].map(tab => (
                <button 
                  key={tab.key} 
                  onClick={() => { setActiveTab(tab.key); setSelectedMember(null); }} 
                  className={`flex-1 py-3 px-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${activeTab === tab.key && !selectedMember ? `bg-gradient-to-r ${tab.color} text-white shadow-md` : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  <tab.icon size={18} />
                  <span className="hidden sm:inline">{tab.label}</span> ({tab.count})
                </button>
              ))}
            </div>

            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {displayBooks.map(book => (
                <div 
                  key={book.id} 
                  onClick={() => { setSelectedBook(book); setSelectedMember(null); }} 
                  className={`p-4 rounded-2xl cursor-pointer transition-all ${selectedBook?.id === book.id ? 'bg-gradient-to-r from-pink-100 to-purple-100 shadow-md' : 'bg-gray-50 hover:bg-gray-100'}`}
                >
                  <div className="flex gap-4">
                    {book.coverUrl && <img src={book.coverUrl} alt={book.title} className="w-16 h-24 object-cover rounded-lg shadow-md" />}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-800 truncate">{book.title}</h3>
                      <p className="text-sm text-gray-600 truncate">{book.author}</p>
                      {book.suggestedBy && (
                        <p className="text-xs text-purple-600 mt-1">Suggéré par {book.suggestedBy}</p>
                      )}
                      <div className="flex gap-2 mt-2 text-xs text-gray-500">
                        <span>📖 {book.pages}p</span>
                        {book.price && <span>💰 {book.price}</span>}
                      </div>
                      {book.reviews.length > 0 && (
                        <div className="flex items-center gap-2 mt-2">
                          <Star size={14} className="fill-pink-400 text-pink-400" />
                          <span className="text-sm font-semibold text-pink-600">{(book.reviews.reduce((a, r) => a + r.rating, 0) / book.reviews.length).toFixed(1)}/10</span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <button 
                        onClick={(e) => { e.stopPropagation(); toggleBookStatus(book.id); }} 
                        className={`p-2 rounded-lg ${book.status === 'read' ? 'bg-green-100 text-green-600' : book.status === 'reading' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}
                      >
                        {book.status === 'read' ? <CheckCircle size={16} /> : book.status === 'reading' ? <BookOpen size={16} /> : <Clock size={16} />}
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setEditingBook(book); }} 
                        className="p-2 rounded-lg bg-blue-100 text-blue-600"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); deleteBook(book.id); }} 
                        className="p-2 rounded-lg bg-red-100 text-red-600"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {displayBooks.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <BookOpen size={48} className="mx-auto mb-3 opacity-50" />
                  <p>Aucun livre</p>
                </div>
              )}
            </div>
          </div>

          {/* Détails */}
          <div className="bg-white rounded-3xl shadow-lg p-6">
            {selectedMember ? (
              <div>
                <div className="text-center mb-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full mx-auto mb-3 flex items-center justify-center text-white text-3xl font-bold">
                    {selectedMember.name[0]}
                  </div>
                  <h2 className="text-2xl font-bold text-gray-800">{selectedMember.name}</h2>
                  <button 
                    onClick={() => setSelectedMember(null)}
                    className="text-sm text-gray-500 hover:text-gray-700 mt-2"
                  >
                    ← Retour aux livres
                  </button>
                </div>

                <div className="space-y-6 max-h-[500px] overflow-y-auto">
                  {/* Livres suggérés */}
                  <div>
                    <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                      <Sparkles size={20} className="text-yellow-500" />
                      Livres suggérés ({getMemberActivity(selectedMember.name).suggestedBooks.length})
                    </h3>
                    {getMemberActivity(selectedMember.name).suggestedBooks.map(book => (
                      <div 
                        key={book.id}
                        onClick={() => { setSelectedBook(book); setSelectedMember(null); }}
                        className="bg-yellow-50 p-4 rounded-2xl mb-2 cursor-pointer hover:shadow-md"
                      >
                        <p className="font-bold text-gray-800">{book.title}</p>
                        <p className="text-sm text-gray-600">{book.author}</p>
                      </div>
                    ))}
                    {getMemberActivity(selectedMember.name).suggestedBooks.length === 0 && (
                      <p className="text-gray-400 text-sm">Aucun livre suggéré</p>
                    )}
                  </div>

                  {/* Avis */}
                  <div>
                    <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                      <Star size={20} className="text-pink-500" />
                      Avis ({getMemberActivity(selectedMember.name).reviews.length})
                    </h3>
                    {getMemberActivity(selectedMember.name).reviews.map(review => (
                      <div 
                        key={review.id}
                        onClick={() => { 
                          setSelectedBook(books.find(b => b.id === review.bookId)); 
                          setSelectedMember(null); 
                        }}
                        className="bg-pink-50 p-4 rounded-2xl mb-2 cursor-pointer hover:shadow-md"
                      >
                        <p className="font-bold text-gray-800 mb-1">{review.bookTitle}</p>
                        <div className="flex items-center gap-1 mb-2">
                          <Star size={16} className="fill-pink-400 text-pink-400" />
                          <span className="font-bold text-pink-600">{review.rating}/10</span>
                        </div>
                        {review.comment && <p className="text-sm mt-2">{review.comment}</p>}
                      </div>
                    ))}
                    {getMemberActivity(selectedMember.name).reviews.length === 0 && (
                      <p className="text-gray-400 text-sm">Aucun avis</p>
                    )}
                  </div>

                  {/* Citations */}
                  <div>
                    <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                      <Quote size={20} className="text-purple-500" />
                      Citations ({getMemberActivity(selectedMember.name).quotes.length})
                    </h3>
                    {getMemberActivity(selectedMember.name).quotes.map(quote => (
                      <div 
                        key={quote.id}
                        onClick={() => { 
                          setSelectedBook(books.find(b => b.id === quote.bookId)); 
                          setSelectedMember(null); 
                        }}
                        className="bg-purple-50 p-4 rounded-2xl mb-2 cursor-pointer hover:shadow-md"
                      >
                        <p className="font-bold text-gray-800 mb-2">{quote.bookTitle}</p>
                        <div className="flex gap-2">
                          <Quote size={16} className="text-purple-400 flex-shrink-0 mt-1" />
                          <p className="text-sm italic">{quote.text}</p>
                        </div>
                      </div>
                    ))}
                    {getMemberActivity(selectedMember.name).quotes.length === 0 && (
                      <p className="text-gray-400 text-sm">Aucune citation</p>
                    )}
                  </div>
                </div>
              </div>
            ) : selectedBook ? (
              <div>
                {selectedBook.coverUrl && (
                  <div className="flex justify-center mb-6">
                    <img src={selectedBook.coverUrl} alt={selectedBook.title} className="w-48 h-72 object-cover rounded-xl shadow-lg" />
                  </div>
                )}
                <h2 className="text-2xl font-bold text-gray-800 text-center mb-2">{selectedBook.title}</h2>
                <p className="text-center text-gray-600 mb-4">{selectedBook.author}</p>
                
                <div className="space-y-4 max-h-[500px] overflow-y-auto">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-blue-50 p-4 rounded-2xl">
                      <p className="text-sm text-gray-600 mb-1">📖 Pages</p>
                      <p className="font-semibold">{selectedBook.pages}</p>
                    </div>
                    
                    {selectedBook.price && (
                      <div className="bg-green-50 p-4 rounded-2xl">
                        <p className="text-sm text-gray-600 mb-1">💰 Prix</p>
                        <p className="font-semibold">{selectedBook.price}</p>
                      </div>
                    )}
                    
                    {selectedBook.year && (
                      <div className="bg-purple-50 p-4 rounded-2xl">
                        <p className="text-sm text-gray-600 mb-1">📅 Année</p>
                        <p className="font-semibold">{selectedBook.year}</p>
                      </div>
                    )}

                    {selectedBook.startDate && (
                      <div className="bg-indigo-50 p-4 rounded-2xl">
                        <p className="text-sm text-gray-600 mb-1">▶️ Début</p>
                        <p className="font-semibold text-sm">{new Date(selectedBook.startDate).toLocaleDateString('fr-FR')}</p>
                      </div>
                    )}

                    {selectedBook.endDate && (
                      <div className="bg-teal-50 p-4 rounded-2xl">
                        <p className="text-sm text-gray-600 mb-1">🏁 Fin</p>
                        <p className="font-semibold text-sm">{new Date(selectedBook.endDate).toLocaleDateString('fr-FR')}</p>
                      </div>
                    )}
                  </div>

                  {selectedBook.genres && selectedBook.genres.length > 0 && (
                    <div className="bg-pink-50 p-4 rounded-2xl">
                      <p className="text-sm text-gray-600 mb-2">🏷️ Genres</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedBook.genres.map((genre, idx) => (
                          <span key={idx} className="px-3 py-1 bg-white rounded-full text-sm font-medium text-pink-600">
                            {genre}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {selectedBook.suggestedBy && (
                    <div className="bg-yellow-50 p-4 rounded-2xl">
                      <p className="text-sm text-gray-600 mb-1">✨ Suggéré par</p>
                      <p className="font-semibold">{selectedBook.suggestedBy}</p>
                    </div>
                  )}

                  {selectedBook.summary && (
                    <div className="bg-orange-50 p-4 rounded-2xl">
                      <p className="text-sm text-gray-600 mb-2">📝 Résumé</p>
                      <p className="text-sm">{selectedBook.summary}</p>
                    </div>
                  )}

                  {/* Citations */}
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold flex items-center gap-2">
                        <Quote size={20} className="text-purple-500" />
                        Citations & Extraits
                      </h3>
                      <button 
                        onClick={() => setShowAddQuote(true)} 
                        className="bg-purple-500 text-white px-4 py-2 rounded-xl text-sm flex items-center gap-2"
                      >
                        <Plus size={16} />
                        Ajouter
                      </button>
                    </div>
                    {selectedBook.quotes?.map((q, i) => (
                      <div key={i} className="bg-purple-50 p-4 rounded-2xl mb-2 border-l-4 border-purple-400">
                        <p className="font-bold text-purple-800 mb-2">{q.member}</p>
                        <div className="flex gap-2">
                          <Quote size={16} className="text-purple-400 flex-shrink-0 mt-1" />
                          <p className="text-sm italic text-gray-700">{q.text}</p>
                        </div>
                      </div>
                    ))}
                    {(!selectedBook.quotes || selectedBook.quotes.length === 0) && (
                      <p className="text-gray-400 text-sm text-center py-4">Aucune citation</p>
                    )}
                  </div>

                  {/* Avis */}
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold">Avis</h3>
                      <button 
                        onClick={() => setShowAddReview(true)} 
                        className="bg-pink-500 text-white px-4 py-2 rounded-xl text-sm flex items-center gap-2"
                      >
                        <Plus size={16} />
                        Ajouter
                      </button>
                    </div>
                    {selectedBook.reviews?.map((r, i) => (
                      <div key={i} className="bg-pink-50 p-4 rounded-2xl mb-2">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <p className="font-bold">{r.member}</p>
                            {r.reading_time && (
                              <p className="text-xs text-gray-600 mt-1">⏱️ Temps de lecture: {r.reading_time}</p>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="flex items-center gap-1">
                              <Star size={16} className="fill-pink-400 text-pink-400" />
                              <span className="font-bold text-lg text-pink-600">{r.rating}/10</span>
                            </div>
                          </div>
                        </div>
                        
                        {(r.writing || r.plot || r.characters || r.impact) && (
                          <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                            <div className="bg-white p-2 rounded-lg">
                              <p className="text-gray-600">✍️ Écriture</p>
                              <p className="font-semibold text-pink-600">{r.writing}/10</p>
                            </div>
                            <div className="bg-white p-2 rounded-lg">
                              <p className="text-gray-600">📖 Intrigue</p>
                              <p className="font-semibold text-pink-600">{r.plot}/10</p>
                            </div>
                            <div className="bg-white p-2 rounded-lg">
                              <p className="text-gray-600">👥 Personnages</p>
                              <p className="font-semibold text-pink-600">{r.characters}/10</p>
                            </div>
                            <div className="bg-white p-2 rounded-lg">
                              <p className="text-gray-600">💫 Impact</p>
                              <p className="font-semibold text-pink-600">{r.impact}/10</p>
                            </div>
                          </div>
                        )}
                        
                        {r.comment && <p className="text-sm">{r.comment}</p>}
                      </div>
                    ))}
                    {(!selectedBook.reviews || selectedBook.reviews.length === 0) && (
                      <p className="text-gray-400 text-sm text-center py-4">Aucun avis</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <BookOpen size={64} className="mb-4" />
                <p>Sélectionnez un livre ou un membre</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showAddBook && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6">Nouveau livre</h2>
            <div className="space-y-4">
              <input 
                type="text" 
                placeholder="Titre" 
                value={newBook.title} 
                onChange={(e) => setNewBook({...newBook, title: e.target.value})} 
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 outline-none" 
              />
              <input 
                type="text" 
                placeholder="Auteur" 
                value={newBook.author} 
                onChange={(e) => setNewBook({...newBook, author: e.target.value})} 
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 outline-none" 
              />
              
              {/* Upload d'image */}
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center">
                <input 
                  type="file" 
                  id="coverImage" 
                  accept="image/*"
                  onChange={handleCoverImageChange}
                  className="hidden"
                />
                <label htmlFor="coverImage" className="cursor-pointer">
                  {coverImagePreview ? (
                    <img src={coverImagePreview} alt="Aperçu" className="w-32 h-48 object-cover rounded-lg mx-auto mb-3" />
                  ) : (
                    <Upload size={48} className="mx-auto mb-3 text-gray-400" />
                  )}
                  <p className="text-sm text-gray-600">
                    {coverImagePreview ? 'Changer l\'image' : 'Charger une couverture'}
                  </p>
                </label>
              </div>

              <input 
                type="number" 
                placeholder="Pages" 
                value={newBook.pages} 
                onChange={(e) => setNewBook({...newBook, pages: e.target.value})} 
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 outline-none" 
              />
              <input 
                type="text" 
                placeholder="Prix" 
                value={newBook.price} 
                onChange={(e) => setNewBook({...newBook, price: e.target.value})} 
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 outline-none" 
              />
              
              <input 
                type="text" 
                placeholder="Année de publication" 
                value={newBook.year} 
                onChange={(e) => setNewBook({...newBook, year: e.target.value})} 
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 outline-none" 
              />
              
              <div>
                <input 
                  type="text" 
                  placeholder="Genres (séparés par des virgules)" 
                  value={newBook.genres.join(', ')}
                  onChange={(e) => setNewBook({...newBook, genres: e.target.value.split(',').map(g => g.trim()).filter(g => g)})} 
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 outline-none" 
                />
                <p className="text-xs text-gray-500 mt-1 ml-1">Ex: Romance, Fantasy, Thriller</p>
              </div>

              <input 
                type="date" 
                placeholder="Date de début de lecture" 
                value={newBook.startDate} 
                onChange={(e) => setNewBook({...newBook, startDate: e.target.value})} 
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 outline-none" 
              />

              <input 
                type="date" 
                placeholder="Date de fin de lecture" 
                value={newBook.endDate} 
                onChange={(e) => setNewBook({...newBook, endDate: e.target.value})} 
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 outline-none" 
              />
              
              <select
                value={newBook.suggestedBy}
                onChange={(e) => setNewBook({...newBook, suggestedBy: e.target.value})}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 outline-none bg-white"
              >
                <option value="">Suggéré par...</option>
                {members.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
              </select>

              <textarea 
                placeholder="Résumé" 
                value={newBook.summary} 
                onChange={(e) => setNewBook({...newBook, summary: e.target.value})} 
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 outline-none h-24 resize-none" 
              />
            </div>
            <div className="flex gap-3 mt-6">
              <button 
                onClick={addBook} 
                disabled={isUploading}
                className="flex-1 bg-pink-500 text-white px-6 py-3 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploading ? 'Upload...' : 'Ajouter'}
              </button>
              <button 
                onClick={() => {
                  setShowAddBook(false);
                  setCoverImagePreview('');
                  setCoverImageFile(null);
                }} 
                disabled={isUploading}
                className="flex-1 bg-gray-200 px-6 py-3 rounded-xl font-semibold disabled:opacity-50"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddMember && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-6">Nouveau membre</h2>
            <input 
              type="text" 
              placeholder="Prénom" 
              value={newMemberName} 
              onChange={(e) => setNewMemberName(e.target.value)} 
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 outline-none" 
            />
            <div className="flex gap-3 mt-6">
              <button 
                onClick={addMember} 
                className="flex-1 bg-blue-500 text-white px-6 py-3 rounded-xl font-semibold"
              >
                Ajouter
              </button>
              <button 
                onClick={() => setShowAddMember(false)} 
                className="flex-1 bg-gray-200 px-6 py-3 rounded-xl font-semibold"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddReview && selectedBook && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6">Ajouter un avis</h2>
            <div className="space-y-4">
              <select 
                value={newReview.member} 
                onChange={(e) => setNewReview({...newReview, member: e.target.value})} 
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 outline-none bg-white"
              >
                <option value="">Sélectionner un membre</option>
                {members.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
              </select>
              
              <input 
                type="text" 
                placeholder="Temps de lecture (ex: 2 semaines, 5 jours...)" 
                value={newReview.readingTime} 
                onChange={(e) => setNewReview({...newReview, readingTime: e.target.value})} 
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 outline-none" 
              />
              
              <div className="space-y-3">
                <div className="bg-blue-50 p-4 rounded-xl">
                  <p className="text-sm font-semibold mb-2">✍️ Écriture & style</p>
                  <StarRating rating={newReview.writing} onRate={(r) => setNewReview({...newReview, writing: r})} />
                </div>
                
                <div className="bg-purple-50 p-4 rounded-xl">
                  <p className="text-sm font-semibold mb-2">📖 Intrigue & structure</p>
                  <StarRating rating={newReview.plot} onRate={(r) => setNewReview({...newReview, plot: r})} />
                </div>
                
                <div className="bg-pink-50 p-4 rounded-xl">
                  <p className="text-sm font-semibold mb-2">👥 Personnages</p>
                  <StarRating rating={newReview.characters} onRate={(r) => setNewReview({...newReview, characters: r})} />
                </div>
                
                <div className="bg-yellow-50 p-4 rounded-xl">
                  <p className="text-sm font-semibold mb-2">💫 Impact & plaisir</p>
                  <StarRating rating={newReview.impact} onRate={(r) => setNewReview({...newReview, impact: r})} />
                </div>
                
                {(newReview.writing > 0 || newReview.plot > 0 || newReview.characters > 0 || newReview.impact > 0) && (
                  <div className="bg-gradient-to-r from-pink-100 to-purple-100 p-4 rounded-xl text-center">
                    <p className="text-sm text-gray-600 mb-1">Note finale</p>
                    <div className="flex items-center justify-center gap-2">
                      <Star size={24} className="fill-pink-500 text-pink-500" />
                      <p className="text-3xl font-bold text-pink-600">
                        {((newReview.writing + newReview.plot + newReview.characters + newReview.impact) / 4).toFixed(1)}/10
                      </p>
                    </div>
                  </div>
                )}
              </div>
              
              <textarea 
                placeholder="Commentaire (optionnel)" 
                value={newReview.comment} 
                onChange={(e) => setNewReview({...newReview, comment: e.target.value})} 
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 outline-none h-24 resize-none" 
              />
            </div>
            <div className="flex gap-3 mt-6">
              <button 
                onClick={addReview} 
                className="flex-1 bg-pink-500 text-white px-6 py-3 rounded-xl font-semibold"
              >
                Publier
              </button>
              <button 
                onClick={() => setShowAddReview(false)} 
                className="flex-1 bg-gray-200 px-6 py-3 rounded-xl font-semibold"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddQuote && selectedBook && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-6">Ajouter une citation</h2>
            <div className="space-y-4">
              <select 
                value={newQuote.member} 
                onChange={(e) => setNewQuote({...newQuote, member: e.target.value})} 
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 outline-none bg-white"
              >
                <option value="">Sélectionner un membre</option>
                {members.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
              </select>
              <textarea 
                placeholder="Extrait marquant ou citation inspirante..." 
                value={newQuote.text} 
                onChange={(e) => setNewQuote({...newQuote, text: e.target.value})} 
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 outline-none h-32 resize-none" 
              />
            </div>
            <div className="flex gap-3 mt-6">
              <button 
                onClick={addQuote} 
                className="flex-1 bg-purple-500 text-white px-6 py-3 rounded-xl font-semibold"
              >
                Publier
              </button>
              <button 
                onClick={() => setShowAddQuote(false)} 
                className="flex-1 bg-gray-200 px-6 py-3 rounded-xl font-semibold"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {editingBook && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6">Modifier le livre</h2>
            <div className="space-y-4">
              <input 
                type="text" 
                value={editingBook.title} 
                onChange={(e) => setEditingBook({...editingBook, title: e.target.value})} 
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 outline-none" 
              />
              <input 
                type="text" 
                value={editingBook.author} 
                onChange={(e) => setEditingBook({...editingBook, author: e.target.value})} 
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 outline-none" 
              />
              <input 
                type="number" 
                value={editingBook.pages} 
                onChange={(e) => setEditingBook({...editingBook, pages: e.target.value})} 
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 outline-none" 
              />
              <input 
                type="text" 
                value={editingBook.price} 
                onChange={(e) => setEditingBook({...editingBook, price: e.target.value})} 
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 outline-none" 
              />
              <input 
                type="text" 
                placeholder="Année" 
                value={editingBook.year || ''} 
                onChange={(e) => setEditingBook({...editingBook, year: e.target.value})} 
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 outline-none" 
              />
              <div>
                <input 
                  type="text" 
                  placeholder="Genres (séparés par des virgules)" 
                  value={editingBook.genres?.join(', ') || ''}
                  onChange={(e) => setEditingBook({...editingBook, genres: e.target.value.split(',').map(g => g.trim()).filter(g => g)})} 
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 outline-none" 
                />
                <p className="text-xs text-gray-500 mt-1 ml-1">Ex: Romance, Fantasy, Thriller</p>
              </div>
              <input 
                type="date" 
                placeholder="Date de début" 
                value={editingBook.startDate || ''} 
                onChange={(e) => setEditingBook({...editingBook, startDate: e.target.value})} 
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 outline-none" 
              />
              <input 
                type="date" 
                placeholder="Date de fin" 
                value={editingBook.endDate || ''} 
                onChange={(e) => setEditingBook({...editingBook, endDate: e.target.value})} 
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 outline-none" 
              />
              <textarea 
                value={editingBook.summary} 
                onChange={(e) => setEditingBook({...editingBook, summary: e.target.value})} 
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 outline-none h-24 resize-none" 
              />
            </div>
            <div className="flex gap-3 mt-6">
              <button 
                onClick={updateBook} 
                className="flex-1 bg-blue-500 text-white px-6 py-3 rounded-xl font-semibold"
              >
                Enregistrer
              </button>
              <button 
                onClick={() => setEditingBook(null)} 
                className="flex-1 bg-gray-200 px-6 py-3 rounded-xl font-semibold"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
